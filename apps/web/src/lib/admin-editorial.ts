/**
 * admin-editorial — Firestore CRUD for the editorial collections:
 *   - /series/{slug}       (ordered article series)
 *   - /topics/{slug}       (taxonomy labels)
 *   - /pages/{slug}        (about / privacy / terms)
 *
 * Mirrors the patterns in admin-firestore.ts:
 *   - Every write requires an authed session (Firestore rules are the real
 *     gate; this is a belt-and-braces client check).
 *   - Writes stamp updatedAt always, and createdAt on first write.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';

import { getDb, getFirebaseAuth } from './firebase';
import type { PageDoc, SeriesDoc, TopicDoc } from './content-schema';

function requireAdminAuth() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Not signed in');
  return user;
}

/** Remove undefined values — Firestore rejects them. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out as T;
}

// ---------- Series ----------

const SERIES = 'series';

export async function listSeries(): Promise<Array<SeriesDoc & { id: string }>> {
  const snap = await getDocs(collection(getDb(), SERIES));
  const rows: Array<SeriesDoc & { id: string }> = [];
  for (const d of snap.docs) {
    const data = d.data() as Partial<SeriesDoc>;
    if (data.translations && 'en' in data.translations) {
      rows.push({ id: d.id, ...(data as SeriesDoc) });
    }
  }
  rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return rows;
}

export async function saveSeries(slug: string, data: SeriesDoc): Promise<void> {
  requireAdminAuth();
  const ref = doc(getDb(), SERIES, slug);
  const existing = await getDoc(ref);
  const payload: DocumentData = stripUndefined({
    ...data,
    slug,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
  });
  if (!existing.exists()) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: false });
}

export async function deleteSeries(slug: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), SERIES, slug));
}

// ---------- Topics ----------

const TOPICS = 'topics';

export async function listTopicsAdmin(): Promise<Array<TopicDoc & { id: string }>> {
  const snap = await getDocs(collection(getDb(), TOPICS));
  const rows: Array<TopicDoc & { id: string }> = [];
  for (const d of snap.docs) {
    const data = d.data() as Partial<TopicDoc>;
    if (data.translations && 'en' in data.translations) {
      rows.push({ id: d.id, ...(data as TopicDoc) });
    }
  }
  rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return rows;
}

export async function saveTopic(slug: string, data: TopicDoc): Promise<void> {
  requireAdminAuth();
  const ref = doc(getDb(), TOPICS, slug);
  const existing = await getDoc(ref);
  const payload: DocumentData = stripUndefined({
    ...data,
    slug,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
  });
  if (!existing.exists()) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: false });
}

export async function deleteTopic(slug: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), TOPICS, slug));
}

// ---------- Editorial Pages (about / privacy / terms) ----------

const PAGES = 'pages';
export type PageSlug = 'about' | 'privacy' | 'terms';

export async function getPageAdmin(
  slug: PageSlug,
): Promise<(PageDoc & { id: string }) | null> {
  const snap = await getDoc(doc(getDb(), PAGES, slug));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<PageDoc>;
  if (!data.translations || !('en' in data.translations)) return null;
  return { id: snap.id, ...(data as PageDoc) };
}

export async function savePage(slug: PageSlug, data: PageDoc): Promise<void> {
  requireAdminAuth();
  const ref = doc(getDb(), PAGES, slug);
  const existing = await getDoc(ref);
  const payload: DocumentData = stripUndefined({
    ...data,
    slug,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
  });
  if (!existing.exists()) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: false });
}
