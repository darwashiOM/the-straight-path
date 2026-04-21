/**
 * Media library — thin wrapper over Firebase Storage + a mirrored
 * `/media/{id}` Firestore index doc.
 *
 * On Spark plan Storage must be enabled once via the Firebase Console before
 * any upload succeeds. Error paths that look like "bucket not configured" are
 * surfaced as `StorageNotConfiguredError` so the UI can render a friendly
 * setup card instead of a raw Firebase error.
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
  type Timestamp,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';

import { getDb, getFirebaseAuth, getFirebaseStorage } from './firebase';
import type { MediaDoc } from './content-schema';

export class StorageNotConfiguredError extends Error {
  constructor(message = 'Firebase Storage is not enabled for this project.') {
    super(message);
    this.name = 'StorageNotConfiguredError';
  }
}

const MEDIA = 'media';

/**
 * Upload a file to Storage + index it in Firestore. Returns the new media doc.
 * Throws `StorageNotConfiguredError` when the bucket doesn't exist yet.
 */
export async function uploadMedia(file: File, alt: string): Promise<MediaDoc> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Not signed in');

  const id = generateId();
  const ext = guessExtension(file);
  const path = `media/${id}${ext}`;
  const ref = storageRef(getFirebaseStorage(), path);

  try {
    await uploadBytes(ref, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: { uploadedBy: user.uid, alt },
    });
  } catch (err) {
    throw wrapStorageError(err);
  }

  let url: string;
  try {
    url = await getDownloadURL(ref);
  } catch (err) {
    throw wrapStorageError(err);
  }

  const payload = {
    url,
    path,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    alt,
    uploadedBy: user.uid,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(getDb(), MEDIA), payload);

  return {
    id: docRef.id,
    url,
    path,
    contentType: payload.contentType,
    size: payload.size,
    alt,
    uploadedBy: user.uid,
    createdAt: undefined as unknown as Timestamp,
  };
}

/** List every media item, newest first. */
export async function listMedia(): Promise<MediaDoc[]> {
  const snap = await getDocs(
    query(collection(getDb(), MEDIA), orderBy('createdAt', 'desc')),
  ).catch(async () => getDocs(collection(getDb(), MEDIA)));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MediaDoc, 'id'>),
  }));
}

/** Delete both the Storage object and its Firestore index doc. */
export async function deleteMedia(id: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Not signed in');
  // Fetch the doc to learn the storage path.
  const snap = await getDocs(collection(getDb(), MEDIA));
  const found = snap.docs.find((d) => d.id === id);
  if (!found) return;
  const data = found.data() as MediaDoc;
  if (data.path) {
    try {
      await deleteObject(storageRef(getFirebaseStorage(), data.path));
    } catch (err) {
      // If the object is already gone that's fine; anything else we bubble up
      // as a configured-storage error so the UI can retry.
      const wrapped = wrapStorageError(err);
      if (!(wrapped instanceof StorageNotConfiguredError)) {
        // Swallow "not found" — still delete the index doc so the UI is clean.
        const code = (err as { code?: string } | null)?.code;
        if (code !== 'storage/object-not-found') throw wrapped;
      } else {
        throw wrapped;
      }
    }
  }
  await deleteDoc(doc(getDb(), MEDIA, id));
}

// ---------- internal ----------

function generateId(): string {
  // Random, URL-safe, collision-resistant enough for admin-scale usage.
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

function guessExtension(file: File): string {
  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  if (dot > 0 && dot < name.length - 1) return name.slice(dot).toLowerCase();
  // Fall back to a mime-driven extension for the common cases.
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/svg+xml') return '.svg';
  return '';
}

function wrapStorageError(err: unknown): Error {
  const code = (err as { code?: string } | null)?.code ?? '';
  const message = (err as { message?: string } | null)?.message ?? '';
  if (
    code === 'storage/unknown' ||
    code === 'storage/unauthorized' ||
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    /404|bucket|not configured|no bucket|not found/i.test(message)
  ) {
    if (code === 'storage/unauthorized') {
      return err instanceof Error ? err : new Error(String(err));
    }
    return new StorageNotConfiguredError(
      'Firebase Storage is not enabled for this project yet. Open the Storage console to finish setup.',
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}
