import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';

initializeApp();

setGlobalOptions({
  region: 'us-east4',
  maxInstances: 10,
  memory: '256MiB',
});

/**
 * Health check endpoint.
 */
export const health = onRequest((_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Triggered when a contact-submission document is created.
 * Logs and (in production) emails the submission to the admin team.
 */
export const onContactSubmission = onDocumentCreated(
  'contact-submissions/{id}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    logger.info('New contact submission', {
      id: event.params.id,
      name: data.name,
      email: data.email,
    });
    // SP-10 will add real email delivery (SendGrid / Resend / SMTP).
  },
);
