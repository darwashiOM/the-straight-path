import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { defineSecret, defineString } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';

import { sendContactEmail } from './contact/email';
import { createNotionPage } from './contact/notion';
import { parseSubmission } from './contact/types';

// Re-export shared Firestore schemas for consumers (admin panel, scripts).
export * as schemas from './schemas';

initializeApp();

setGlobalOptions({
  region: 'us-east4',
  maxInstances: 10,
  memory: '256MiB',
});

/**
 * Health check endpoint.
 *
 * ---
 * Rate limiting note:
 * Cloud Functions v2 does not ship with a built-in rate limiter. For
 * public HTTP endpoints, rate-limit at the edge:
 *   1. Put Firebase Hosting in front of the function (already configured
 *      in `firebase.json` rewrites) — Hosting provides basic DDoS
 *      protection via Google's edge.
 *   2. For per-IP limits on abusable endpoints, add Cloud Armor in front
 *      of the function's load balancer (Blaze-only) or implement a
 *      token-bucket using Firestore:
 *
 *        const ref = db.doc(`rate-limits/${ip}`);
 *        await db.runTransaction(async (tx) => {
 *          const doc = await tx.get(ref);
 *          // reject if doc.data().count > N within window...
 *        });
 *
 *   3. For the contact form specifically, rely on the Firestore rules
 *      (rate-limit writes per-UID / per-IP) plus App Check.
 */
export const health = onRequest((_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Contact form notifications
// ---------------------------------------------------------------------------

/** Secrets: set with `firebase functions:secrets:set <NAME>` (never in source). */
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const NOTION_API_KEY = defineSecret('NOTION_API_KEY');

/** Plain params: set in `functions/.env` (see `functions/.env.example`). */
const CONTACT_NOTIFY_EMAIL = defineString('CONTACT_NOTIFY_EMAIL', {
  description: 'Comma-separated inbox(es) that receive every contact-form submission.',
});
const CONTACT_FROM_EMAIL = defineString('CONTACT_FROM_EMAIL', {
  description: 'Sender shown on notification emails; its domain must be verified in Resend.',
  default: 'The Straight Path <contact@thestraightpath.org>',
});
const NOTION_DATABASE_ID = defineString('NOTION_DATABASE_ID', {
  description: 'Notion database that receives one row per submission.',
});
const NOTION_ASSIGNEE_ID = defineString('NOTION_ASSIGNEE_ID', {
  description: 'Optional Notion user id to put in "Assigned To" on each new row.',
  default: '',
});

type Outcome =
  | { ok: true; at: FieldValue; id: string; url?: string }
  | { ok: false; at: FieldValue; error: string };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Triggered when a `contact-submissions/{id}` document is created.
 *
 * Fans the submission out to two independent channels — a Notion database
 * row (the team's shared queue) and an email to the admin inbox — then
 * stamps the document with the outcome of each. A failure in one channel
 * never blocks the other, and nothing throws: the Firestore write already
 * succeeded and we don't want infinite retries. Re-send by hand from the
 * `notifications` field if a channel reports `ok: false`.
 *
 * A channel whose config is missing is skipped with a warning, so the
 * function is safe to deploy before the secrets are set.
 */
export const onContactSubmission = onDocumentCreated(
  {
    document: 'contact-submissions/{id}',
    secrets: [RESEND_API_KEY, NOTION_API_KEY],
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const submission = parseSubmission(event.params.id, snap.data());
    logger.info('New contact submission', {
      id: submission.id,
      type: submission.type,
      requests: submission.support?.requests ?? [],
    });

    const notifications: { notion?: Outcome; email?: Outcome } = {};
    let notionUrl: string | undefined;

    // 1. Notion — first, so the email can link to the row.
    const notionToken = NOTION_API_KEY.value();
    const notionDb = NOTION_DATABASE_ID.value();
    if (notionToken && notionDb) {
      try {
        const page = await createNotionPage(
          { token: notionToken, databaseId: notionDb, assigneeId: NOTION_ASSIGNEE_ID.value() },
          submission,
        );
        notionUrl = page.url || undefined;
        notifications.notion = { ok: true, at: FieldValue.serverTimestamp(), ...page };
        logger.info('Notion row created', { id: submission.id, pageId: page.id });
      } catch (err) {
        notifications.notion = {
          ok: false,
          at: FieldValue.serverTimestamp(),
          error: errorMessage(err),
        };
        logger.error('Notion row failed', { id: submission.id, error: errorMessage(err) });
      }
    } else {
      logger.warn('Notion not configured (NOTION_API_KEY / NOTION_DATABASE_ID); skipping');
    }

    // 2. Email.
    const resendKey = RESEND_API_KEY.value();
    const to = CONTACT_NOTIFY_EMAIL.value()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (resendKey && to.length > 0) {
      try {
        const sent = await sendContactEmail(
          { apiKey: resendKey, from: CONTACT_FROM_EMAIL.value(), to },
          submission,
          notionUrl,
        );
        notifications.email = { ok: true, at: FieldValue.serverTimestamp(), id: sent.id };
        logger.info('Notification email sent', { id: submission.id, emailId: sent.id });
      } catch (err) {
        notifications.email = {
          ok: false,
          at: FieldValue.serverTimestamp(),
          error: errorMessage(err),
        };
        logger.error('Notification email failed', {
          id: submission.id,
          error: errorMessage(err),
        });
      }
    } else {
      logger.warn('Email not configured (RESEND_API_KEY / CONTACT_NOTIFY_EMAIL); skipping');
    }

    // 3. Record what happened on the document itself.
    try {
      await snap.ref.update({ status: 'new', notifications });
    } catch (err) {
      logger.error('Failed to stamp submission', { id: submission.id, error: errorMessage(err) });
    }
  },
);
