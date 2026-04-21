/**
 * Admin CRUD helpers for the translations-nested catalog collections
 * (Resources, FAQs, Channels). Kept in a dedicated file to avoid write
 * conflicts with the V1 helpers in `admin-firestore.ts`.
 *
 * Each write stamps `updatedAt`; inserts additionally stamp `createdAt`.
 * Inserts with `id === null` use `addDoc` (auto-id); named-id saves use
 * `setDoc` with merge so callers can safely re-save partial docs.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';

import { getDb, getFirebaseAuth } from './firebase';
import type { ChannelDoc, FaqDoc, ResourceDoc } from './content-schema';
import { recordAudit } from './audit';

function requireAdminAuth() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Not signed in');
  return user;
}

async function audit(
  action: 'create' | 'update' | 'delete',
  coll: string,
  docId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return;
  await recordAudit({
    uid: user.uid,
    email: user.email ?? '',
    action,
    collection: coll,
    docId,
    ...(before ? { before: toSafeSnapshot(before) } : {}),
    ...(after ? { after: toSafeSnapshot(after) } : {}),
  });
}

function toSafeSnapshot(input: unknown): Record<string, unknown> {
  if (input === null || typeof input !== 'object') return input as Record<string, unknown>;
  if (Array.isArray(input)) {
    return input.map((v) => toSafeSnapshot(v)) as unknown as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && 'seconds' in v && 'nanoseconds' in v) {
      try {
        out[k] = new Date((v as { seconds: number }).seconds * 1000).toISOString();
      } catch {
        out[k] = null;
      }
      continue;
    }
    if (v && typeof v === 'object') {
      out[k] = toSafeSnapshot(v);
      continue;
    }
    out[k] = v;
  }
  return out;
}

const RESOURCES = 'resources';
const FAQS = 'faqs';
const CHANNELS = 'channels';

async function listOrdered<T>(col: string): Promise<Array<T & { id: string; createdAt?: Timestamp; updatedAt?: Timestamp }>> {
  const ref = collection(getDb(), col);
  const snap = await getDocs(query(ref, orderBy('order', 'asc'))).catch(async () =>
    getDocs(ref),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T & { createdAt?: Timestamp; updatedAt?: Timestamp }) }));
}

async function saveDoc<T>(col: string, id: string | null, data: T): Promise<string> {
  requireAdminAuth();
  const payload: DocumentData = { ...data, updatedAt: serverTimestamp() };
  if (id === null) {
    payload.createdAt = serverTimestamp();
    const ref = await addDoc(collection(getDb(), col), payload);
    await audit('create', col, ref.id, undefined, payload);
    return ref.id;
  }
  const existing = await getDoc(doc(getDb(), col, id));
  const before = existing.exists() ? (existing.data() as Record<string, unknown>) : undefined;
  // `setDoc` with merge lets us safely re-save existing docs without wiping
  // server-maintained fields (createdAt stays put) while still creating the
  // doc if a caller passes a brand-new id.
  await setDoc(doc(getDb(), col, id), payload, { merge: true });
  await audit(existing.exists() ? 'update' : 'create', col, id, before, payload);
  return id;
}

async function removeDoc(col: string, id: string): Promise<void> {
  requireAdminAuth();
  const existing = await getDoc(doc(getDb(), col, id));
  const before = existing.exists() ? (existing.data() as Record<string, unknown>) : undefined;
  await deleteDoc(doc(getDb(), col, id));
  await audit('delete', col, id, before, undefined);
}

// ---------- Resources ----------

export type ResourceRecord = ResourceDoc & { id: string; createdAt?: Timestamp; updatedAt?: Timestamp };

export async function listResourcesV2(): Promise<ResourceRecord[]> {
  return listOrdered<ResourceDoc>(RESOURCES);
}

export async function saveResourceV2(id: string | null, data: ResourceDoc): Promise<string> {
  return saveDoc<ResourceDoc>(RESOURCES, id, data);
}

export async function deleteResourceV2(id: string): Promise<void> {
  return removeDoc(RESOURCES, id);
}

// ---------- FAQs ----------

export type FaqRecord = FaqDoc & { id: string; createdAt?: Timestamp; updatedAt?: Timestamp };

export async function listFaqsV2(): Promise<FaqRecord[]> {
  return listOrdered<FaqDoc>(FAQS);
}

export async function saveFaqV2(id: string | null, data: FaqDoc): Promise<string> {
  return saveDoc<FaqDoc>(FAQS, id, data);
}

export async function deleteFaqV2(id: string): Promise<void> {
  return removeDoc(FAQS, id);
}

// ---------- Channels ----------

export type ChannelRecord = ChannelDoc & { id: string; createdAt?: Timestamp; updatedAt?: Timestamp };

export async function listChannelsV2(): Promise<ChannelRecord[]> {
  return listOrdered<ChannelDoc>(CHANNELS);
}

export async function saveChannelV2(id: string | null, data: ChannelDoc): Promise<string> {
  return saveDoc<ChannelDoc>(CHANNELS, id, data);
}

export async function deleteChannelV2(id: string): Promise<void> {
  return removeDoc(CHANNELS, id);
}
