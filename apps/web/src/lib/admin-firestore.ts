/**
 * Admin Firestore CRUD — every write in the admin panel funnels through here.
 *
 * These helpers assume the caller is authenticated and in the `/admins`
 * allowlist; the Firestore security rules are the real gate. The layer here
 * exists to (a) centralise the document shape, (b) attach server timestamps
 * consistently, and (c) make tests trivial to stub.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  orderBy,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';

import { getDb, getFirebaseAuth } from './firebase';

function requireAdminAuth() {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Not signed in');
  return user;
}

// ---------- Articles ----------

export type ArticleStatus = 'draft' | 'published';
export type ArticleLocale = 'en' | 'ar';

export interface AdminArticle {
  id: string; // == slug
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: ArticleStatus;
  locale: ArticleLocale;
  author: string;
  tags: string[];
  heroImage?: string;
  publishedAt?: string; // ISO date
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const ARTICLES = 'articles';

export async function listArticles(): Promise<AdminArticle[]> {
  const snap = await getDocs(query(collection(getDb(), ARTICLES)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminArticle, 'id'>) }));
}

export async function getArticle(id: string): Promise<AdminArticle | null> {
  const snap = await getDoc(doc(getDb(), ARTICLES, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<AdminArticle, 'id'>) };
}

export async function saveArticle(
  slug: string,
  data: Omit<AdminArticle, 'id' | 'createdAt' | 'updatedAt'>,
  isNew: boolean,
): Promise<void> {
  requireAdminAuth();
  const ref = doc(getDb(), ARTICLES, slug);
  const payload: DocumentData = {
    ...data,
    slug,
    updatedAt: serverTimestamp(),
  };
  if (isNew) payload.createdAt = serverTimestamp();
  await setDoc(ref, payload, { merge: !isNew });
}

export async function deleteArticle(id: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), ARTICLES, id));
}

// ---------- Resources (links) ----------

export interface AdminResource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const RESOURCES = 'resources';

export async function listResources(): Promise<AdminResource[]> {
  const snap = await getDocs(
    query(collection(getDb(), RESOURCES), orderBy('order', 'asc')),
  ).catch(async () => getDocs(collection(getDb(), RESOURCES)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminResource, 'id'>) }));
}

export async function createResource(
  data: Omit<AdminResource, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  requireAdminAuth();
  const ref = await addDoc(collection(getDb(), RESOURCES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateResource(
  id: string,
  data: Partial<Omit<AdminResource, 'id'>>,
): Promise<void> {
  requireAdminAuth();
  await updateDoc(doc(getDb(), RESOURCES, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteResource(id: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), RESOURCES, id));
}

// ---------- FAQs ----------

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const FAQS = 'faqs';

export async function listFaqs(): Promise<AdminFaq[]> {
  const snap = await getDocs(collection(getDb(), FAQS));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminFaq, 'id'>) }));
}

export async function createFaq(
  data: Omit<AdminFaq, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  requireAdminAuth();
  const ref = await addDoc(collection(getDb(), FAQS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFaq(
  id: string,
  data: Partial<Omit<AdminFaq, 'id'>>,
): Promise<void> {
  requireAdminAuth();
  await updateDoc(doc(getDb(), FAQS, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteFaq(id: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), FAQS, id));
}

// ---------- Channels ----------

export interface AdminChannel {
  id: string;
  name: string;
  url: string;
  description: string;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const CHANNELS = 'channels';

export async function listChannels(): Promise<AdminChannel[]> {
  const snap = await getDocs(collection(getDb(), CHANNELS));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminChannel, 'id'>) }));
}

export async function createChannel(
  data: Omit<AdminChannel, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  requireAdminAuth();
  const ref = await addDoc(collection(getDb(), CHANNELS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateChannel(
  id: string,
  data: Partial<Omit<AdminChannel, 'id'>>,
): Promise<void> {
  requireAdminAuth();
  await updateDoc(doc(getDb(), CHANNELS, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteChannel(id: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), CHANNELS, id));
}

// ---------- Admins ----------

export interface AdminRecord {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: Timestamp;
}

const ADMINS = 'admins';

export async function listAdmins(): Promise<AdminRecord[]> {
  const snap = await getDocs(collection(getDb(), ADMINS));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<AdminRecord, 'uid'>) }));
}

export async function addAdmin(uid: string, email: string, displayName?: string): Promise<void> {
  requireAdminAuth();
  const ref = doc(getDb(), ADMINS, uid);
  await setDoc(
    ref,
    {
      uid,
      email,
      ...(displayName ? { displayName } : {}),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeAdmin(uid: string): Promise<void> {
  requireAdminAuth();
  await deleteDoc(doc(getDb(), ADMINS, uid));
}
