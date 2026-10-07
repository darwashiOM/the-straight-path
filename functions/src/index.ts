import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { defineSecret, defineString } from 'firebase-functions/params';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import {
  type CustomerEmailConfig,
  RECEIVED_SUBJECT,
  receivedBlocks,
  sendCustomerEmail,
  SHIPPED_SUBJECT,
  shippedBlocks,
} from './billboards/customer-email';
import { sendOrderEmail } from './billboards/email';
import { createOrderPage, listShippedOrders } from './billboards/notion';
import { parseOrder } from './billboards/order';
import { sendContactEmail } from './contact/email';
import { createNotionPage } from './contact/notion';
import { looksLikeEmail, parseSubmission } from './contact/types';

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

// ---------------------------------------------------------------------------
// Mobile-billboard orders
// ---------------------------------------------------------------------------

const BILLBOARD_ORDERS_NOTION_DATABASE_ID = defineString('BILLBOARD_ORDERS_NOTION_DATABASE_ID', {
  description: 'Notion "Mobile Billboard Orders" database that receives one row per order.',
  default: '',
});
const BILLBOARD_ORDERS_NOTION_ASSIGNEE_ID = defineString('BILLBOARD_ORDERS_NOTION_ASSIGNEE_ID', {
  description: 'Optional Notion user id to put in "Assigned To" on each new order.',
  default: '',
});
const BILLBOARD_ORDERS_SHIPPED_STATUS = defineString('BILLBOARD_ORDERS_SHIPPED_STATUS', {
  description: 'Order Status option in Notion that sends the customer the "on the way" email.',
  default: 'Shipped',
});
const BILLBOARD_ORDERS_FROM_EMAIL = defineString('BILLBOARD_ORDERS_FROM_EMAIL', {
  description:
    'Sender of the emails to customers (a no-reply address on the Resend-verified domain).',
  default: 'The Straight Path <no-reply@thestraightpath.org>',
});
const BILLBOARD_ORDERS_REPLY_TO = defineString('BILLBOARD_ORDERS_REPLY_TO', {
  description: 'Optional inbox for customer replies; empty → emails point to the contact page.',
  default: '',
});

function customerEmailConfig(): CustomerEmailConfig {
  return {
    apiKey: RESEND_API_KEY.value(),
    from: BILLBOARD_ORDERS_FROM_EMAIL.value(),
    replyTo: BILLBOARD_ORDERS_REPLY_TO.value().trim() || undefined,
  };
}

/**
 * Triggered when a `billboard-orders/{id}` document is created by the
 * /mobile-billboards page.
 *
 * Re-checks the order (known billboard ids, at most 7 stickers in total —
 * the security rules can't add quantities up), then fans it out like the
 * contact form: a Notion row (the delivery queue) and an email to the
 * contact inbox, plus a "We got your order" email to the customer. A
 * rejected order gets `status: 'rejected'` and no notifications. Uses the
 * same Notion integration and Resend key as the contact form.
 */
export const onBillboardOrder = onDocumentCreated(
  {
    document: 'billboard-orders/{id}',
    secrets: [RESEND_API_KEY, NOTION_API_KEY],
    timeoutSeconds: 60,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const parsed = parseOrder(event.params.id, snap.data());
    if (!parsed.ok) {
      logger.warn('Billboard order rejected', { id: event.params.id, reason: parsed.reason });
      try {
        await snap.ref.update({ status: 'rejected', rejectedReason: parsed.reason });
      } catch (err) {
        logger.error('Failed to stamp rejected order', {
          id: event.params.id,
          error: errorMessage(err),
        });
      }
      return;
    }

    const order = parsed.order;
    logger.info('New billboard order', { id: order.id, total: order.total });

    const notifications: {
      notion?: Outcome & { mapped?: boolean };
      email?: Outcome;
      customer?: Outcome;
    } = {};
    let notionUrl: string | undefined;

    // 1. Notion — first, so the email can link to the row.
    const notionToken = NOTION_API_KEY.value();
    const notionDb = BILLBOARD_ORDERS_NOTION_DATABASE_ID.value();
    if (notionToken && notionDb) {
      try {
        const page = await createOrderPage(
          {
            token: notionToken,
            databaseId: notionDb,
            assigneeId: BILLBOARD_ORDERS_NOTION_ASSIGNEE_ID.value(),
          },
          order,
        );
        notionUrl = page.url || undefined;
        notifications.notion = { ok: true, at: FieldValue.serverTimestamp(), ...page };
        logger.info('Notion order row created', { id: order.id, pageId: page.id });
      } catch (err) {
        notifications.notion = {
          ok: false,
          at: FieldValue.serverTimestamp(),
          error: errorMessage(err),
        };
        logger.error('Notion order row failed', { id: order.id, error: errorMessage(err) });
      }
    } else {
      logger.warn(
        'Notion not configured (NOTION_API_KEY / BILLBOARD_ORDERS_NOTION_DATABASE_ID); skipping',
      );
    }

    // 2. Email.
    const resendKey = RESEND_API_KEY.value();
    const to = CONTACT_NOTIFY_EMAIL.value()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (resendKey && to.length > 0) {
      try {
        const sent = await sendOrderEmail(
          { apiKey: resendKey, from: CONTACT_FROM_EMAIL.value(), to },
          order,
          notionUrl,
        );
        notifications.email = { ok: true, at: FieldValue.serverTimestamp(), id: sent.id };
        logger.info('Order email sent', { id: order.id, emailId: sent.id });
      } catch (err) {
        notifications.email = {
          ok: false,
          at: FieldValue.serverTimestamp(),
          error: errorMessage(err),
        };
        logger.error('Order email failed', { id: order.id, error: errorMessage(err) });
      }
    } else {
      logger.warn('Email not configured (RESEND_API_KEY / CONTACT_NOTIFY_EMAIL); skipping');
    }

    // 3. "We got your order" to the customer.
    const customer = customerEmailConfig();
    if (customer.apiKey && looksLikeEmail(order.email)) {
      try {
        const sent = await sendCustomerEmail(
          customer,
          order.email,
          RECEIVED_SUBJECT,
          receivedBlocks(customer, order),
        );
        notifications.customer = { ok: true, at: FieldValue.serverTimestamp(), id: sent.id };
        logger.info('Customer confirmation sent', { id: order.id, emailId: sent.id });
      } catch (err) {
        notifications.customer = {
          ok: false,
          at: FieldValue.serverTimestamp(),
          error: errorMessage(err),
        };
        logger.error('Customer confirmation failed', { id: order.id, error: errorMessage(err) });
      }
    }

    // 4. Record what happened on the document itself.
    try {
      await snap.ref.update({ status: 'new', total: order.total, notifications });
    } catch (err) {
      logger.error('Failed to stamp order', { id: order.id, error: errorMessage(err) });
    }
  },
);

/** How far back to look for newly shipped rows (status edits). */
const SHIPPED_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;
/** Give up on a customer's "on the way" email after this many failures. */
const SHIPPED_MAX_ATTEMPTS = 3;

/**
 * Every 10 minutes: emails "Your Mobile Billboards are on the way" to each
 * customer whose Notion row was set to Shipped (`BILLBOARD_ORDERS_SHIPPED_STATUS`)
 * in the last few days. Name, email, stickers and address are read from the
 * Notion row, so corrections made there are used.
 *
 * Each row is emailed once: `billboard-shipped-emails/{notionPageId}`
 * records the result (server-only; clients can't read or write it). Setting
 * a row back to Shipped later does not send a second email.
 */
export const notifyShippedBillboardOrders = onSchedule(
  {
    schedule: 'every 10 minutes',
    secrets: [RESEND_API_KEY, NOTION_API_KEY],
    timeoutSeconds: 120,
    maxInstances: 1,
  },
  async () => {
    const token = NOTION_API_KEY.value();
    const databaseId = BILLBOARD_ORDERS_NOTION_DATABASE_ID.value();
    const customer = customerEmailConfig();
    if (!token || !databaseId || !customer.apiKey) return;

    let shipped;
    try {
      shipped = await listShippedOrders(
        token,
        databaseId,
        BILLBOARD_ORDERS_SHIPPED_STATUS.value(),
        new Date(Date.now() - SHIPPED_LOOKBACK_MS),
      );
    } catch (err) {
      logger.error('Could not read shipped orders from Notion', { error: errorMessage(err) });
      return;
    }

    const sentLog = getFirestore().collection('billboard-shipped-emails');
    for (const row of shipped) {
      const ref = sentLog.doc(row.pageId);
      const prev = (await ref.get()).data() as { ok?: boolean; attempts?: number } | undefined;
      if (prev?.ok || (prev?.attempts ?? 0) >= SHIPPED_MAX_ATTEMPTS) continue;

      if (!looksLikeEmail(row.email)) {
        await ref.set({
          ok: false,
          attempts: SHIPPED_MAX_ATTEMPTS,
          error: 'no valid email on the Notion row',
          at: FieldValue.serverTimestamp(),
        });
        logger.warn('Shipped order has no valid email; not notified', { pageId: row.pageId });
        continue;
      }

      try {
        const sent = await sendCustomerEmail(
          customer,
          row.email,
          SHIPPED_SUBJECT,
          shippedBlocks(customer, row),
        );
        await ref.set({
          ok: true,
          id: sent.id,
          email: row.email,
          at: FieldValue.serverTimestamp(),
        });
        logger.info('Shipped email sent', { pageId: row.pageId, emailId: sent.id });
      } catch (err) {
        await ref.set({
          ok: false,
          attempts: (prev?.attempts ?? 0) + 1,
          error: errorMessage(err),
          at: FieldValue.serverTimestamp(),
        });
        logger.error('Shipped email failed', { pageId: row.pageId, error: errorMessage(err) });
      }
    }
  },
);
