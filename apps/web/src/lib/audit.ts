/**
 * Audit log — append-only record of every admin write.
 *
 * This module is a *thin* wrapper around a single `addDoc` to the
 * `/auditLog` collection. It deliberately does NOT know anything about
 * the shape of the content being written; callers pass `before` and
 * `after` snapshots and we store them verbatim. That keeps the audit
 * layer independent of the live content schema — if a field is renamed
 * tomorrow, historical audit rows still tell the true story of what
 * happened yesterday.
 *
 * Firestore security rules (see `firestore.rules`):
 *   - create: admin only
 *   - read:   admin only
 *   - update/delete: never
 *
 * ---------------------------------------------------------------------
 * INTEGRATION — *do not wire this in yet*. The CRUD helpers in
 * `admin-firestore.ts`, `admin-catalog.ts`, `admin-editorial.ts`, etc.
 * are being rewritten by another agent. Once that lands, the author of
 * each `saveX` / `deleteX` should drop the following snippet in right
 * after the successful write:
 *
 *     // After a successful write:
 *     await recordAudit({
 *       uid: auth.currentUser!.uid,
 *       email: auth.currentUser!.email ?? '',
 *       action: isNew ? 'create' : 'update',
 *       collection: 'articles',
 *       docId: slug,
 *       before,           // pass the pre-write snapshot
 *       after: data,
 *     });
 *
 * `recordAudit` swallows its own errors (logging to `console.error`) so
 * a transient audit failure never rolls back a real content write.
 * ---------------------------------------------------------------------
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { getDb } from './firebase';
import type { AuditLogDoc } from './content-schema';

/**
 * Write a single audit entry. The caller supplies everything except the
 * server-assigned `at` timestamp. Failures are logged but not thrown —
 * audit trails are best-effort, not a gate on the user's write.
 */
export async function recordAudit(entry: Omit<AuditLogDoc, 'at'>): Promise<void> {
  try {
    await addDoc(collection(getDb(), 'auditLog'), {
      ...entry,
      at: serverTimestamp(),
    });
  } catch (err) {
    // Never let an audit-write failure break the real CRUD flow.
    // eslint-disable-next-line no-console
    console.error('[audit] failed to record entry', err, entry);
  }
}
