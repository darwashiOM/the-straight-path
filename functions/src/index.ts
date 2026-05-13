import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';

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

/**
 * Triggered when a `contact-submissions/{id}` document is created.
 * Logs the submission and (once email delivery is wired up) notifies the
 * admin team.
 *
 * ---
 * TODO(SP-10): Wire up transactional email once the project is on the
 * Blaze plan. Outbound HTTP requires Blaze — this code must stay
 * commented out on Spark or `firebase deploy --only functions` will fail.
 *
 * Option A — Resend (https://resend.com, simple + great DX):
 *
 *   // package.json  →  "resend": "^4.0.0"
 *   // Runtime secret: firebase functions:secrets:set RESEND_API_KEY
 *
 *   import { defineSecret } from 'firebase-functions/params';
 *   const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
 *
 *   export const onContactSubmission = onDocumentCreated(
 *     { document: 'contact-submissions/{id}', secrets: [RESEND_API_KEY] },
 *     async (event) => {
 *       const data = event.data?.data();
 *       if (!data) return;
 *       const { Resend } = await import('resend');
 *       const resend = new Resend(RESEND_API_KEY.value());
 *       await resend.emails.send({
 *         from: 'The Straight Path <no-reply@thestraightpath.app>',
 *         to: ['admin@thestraightpath.app'],
 *         replyTo: data.email,
 *         subject: `[TSP contact] ${data.subject ?? '(no subject)'}`,
 *         text: `${data.name} <${data.email}>\n\n${data.message}`,
 *       });
 *     },
 *   );
 *
 * Option B — SendGrid (enterprise, higher free tier on Twilio):
 *
 *   // package.json  →  "@sendgrid/mail": "^8.1.0"
 *   // firebase functions:secrets:set SENDGRID_API_KEY
 *
 *   import { defineSecret } from 'firebase-functions/params';
 *   const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
 *
 *   export const onContactSubmission = onDocumentCreated(
 *     { document: 'contact-submissions/{id}', secrets: [SENDGRID_API_KEY] },
 *     async (event) => {
 *       const data = event.data?.data();
 *       if (!data) return;
 *       const sg = await import('@sendgrid/mail');
 *       sg.default.setApiKey(SENDGRID_API_KEY.value());
 *       await sg.default.send({
 *         to: 'admin@thestraightpath.app',
 *         from: 'no-reply@thestraightpath.app',
 *         replyTo: data.email,
 *         subject: `[TSP contact] ${data.subject ?? '(no subject)'}`,
 *         text: `${data.name} <${data.email}>\n\n${data.message}`,
 *       });
 *     },
 *   );
 *
 * Whichever provider we pick:
 *   - Verify the sending domain (SPF / DKIM) before go-live.
 *   - Keep API keys in `functions:secrets`, never in source or env files.
 *   - On delivery failure, log but do NOT throw — the Firestore write has
 *     already succeeded and we don't want infinite retries filling logs.
 */
export const onContactSubmission = onDocumentCreated('contact-submissions/{id}', async (event) => {
  const data = event.data?.data();
  if (!data) return;
  logger.info('New contact submission', {
    id: event.params.id,
    name: data.name,
    email: data.email,
  });
  // See the TODO block above for the email delivery sketch. Enabling
  // that code requires the Blaze plan.
});
