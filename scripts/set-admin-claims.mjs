#!/usr/bin/env node
/**
 * set-admin-claims.mjs
 *
 * Grants the Firebase Auth custom claim `{ admin: true }` to every UID
 * listed in the Firestore `/admins` collection. Run this whenever a new
 * admin is added (the admin Settings page writes the Firestore doc but
 * can't set custom claims from the client — that requires the Admin SDK).
 *
 * Usage:
 *   # Using an explicit service-account key:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json node scripts/set-admin-claims.mjs
 *
 *   # Or using gcloud ADC (preferred locally):
 *   gcloud auth application-default login
 *   node scripts/set-admin-claims.mjs
 *
 * The claim is required by the Storage rules (admin-only write) because
 * Firebase Storage can only check custom claims on the Spark plan —
 * cross-service lookups into Firestore need Blaze.
 */
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const credential =
  keyPath && keyPath.endsWith('.json')
    ? cert(JSON.parse(readFileSync(keyPath, 'utf8')))
    : applicationDefault();

initializeApp({ credential, projectId: 'the-straight-path-tsp' });
const db = getFirestore();
const auth = getAuth();

const snap = await db.collection('admins').get();
for (const doc of snap.docs) {
  const uid = doc.id;
  const email = doc.data().email || '(no email)';
  try {
    await auth.setCustomUserClaims(uid, { admin: true });
    console.log(`granted admin claim → ${email} (${uid})`);
  } catch (err) {
    console.error(`failed for ${uid}:`, err.message);
  }
}
console.log(`done. ${snap.size} user(s) processed.`);
process.exit(0);
