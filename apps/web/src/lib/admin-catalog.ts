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

function requireAdminAuth() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Not signed in');
  return user;
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
    return ref.id;
  }
  // `setDoc` with merge lets us safely re-save existing docs without wiping
  // server-maintained fields (createdAt stays put) while still creating the
  // doc if a caller passes a brand-new id.
  await setDoc(doc(getDb(), col, id), payload, { merge: true });
  return id;
}

async function removeDoc(col: string, id: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), col, id));
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
