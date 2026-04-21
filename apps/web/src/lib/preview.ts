/**
 * Preview library — localStorage-backed staging for the admin live-preview flow.
 *
 * Why localStorage and not sessionStorage:
 *   window.open() gives the new tab a fresh session storage, so sessionStorage
 *   entries staged in the editor tab are invisible to the preview tab. We
 *   therefore use localStorage (shared across tabs of the same origin) with a
 *   short TTL + an explicit cleanup hook so drafts don't linger.
 *
 * Flow:
 *   1. An editor calls `stagePreview(kind, id, draft)` with the in-progress
 *      form state before opening a new tab at the public URL with
 *      `?preview=1` appended.
 *   2. The public page's content loader calls `hasStagedPreview(kind, id)`;
 *      when the viewer is an authenticated admin AND `?preview=1` is set AND
 *      a staged draft exists, it reads the draft via `readPreview()` and uses
 *      it instead of Firestore.
 *   3. The Exit-preview button calls `clearPreview(kind, id)` and strips
 *      `?preview=1` from the URL.
 *
 * Safety:
 *   Staged drafts never leak to non-admins because both hooks and the
 *   PreviewBanner are gated by `useIsAdmin()`. A curious user copying a
 *   `?preview=1` link into their own browser simply sees the live Firestore
 *   content; the staging key doesn't exist on their device.
 */

export type PreviewKind =
  | 'article'
  | 'page'
  | 'siteSetting'
  | 'faq'
  | 'resource'
  | 'channel'
  | 'series'
  | 'topic';

const PREFIX = 'tsp:preview';
/** Staged drafts older than this are ignored + garbage-collected. */
const TTL_MS = 1000 * 60 * 30; // 30 minutes

interface Envelope<T> {
  at: number;
  data: T;
}

function keyFor(kind: PreviewKind, id: string): string {
  return `${PREFIX}:${kind}:${id}`;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Sweep expired entries. Cheap; called on every read/write. */
function gc(): void {
  const s = storage();
  if (!s) return;
  try {
    const now = Date.now();
    for (let i = s.length - 1; i >= 0; i--) {
      const k = s.key(i);
      if (!k || !k.startsWith(`${PREFIX}:`)) continue;
      const raw = s.getItem(k);
      if (!raw) continue;
      try {
        const env = JSON.parse(raw) as Envelope<unknown>;
        if (!env || typeof env.at !== 'number' || now - env.at > TTL_MS) {
          s.removeItem(k);
        }
      } catch {
        s.removeItem(k); // malformed → drop
      }
    }
  } catch {
    // ignore storage errors
  }
}

/** Stage a draft for preview. Silently no-ops when storage is unavailable. */
export function stagePreview(kind: PreviewKind, id: string, data: unknown): void {
  const s = storage();
  if (!s) return;
  gc();
  try {
    const env: Envelope<unknown> = { at: Date.now(), data };
    s.setItem(keyFor(kind, id), JSON.stringify(env));
  } catch {
    // Quota exhausted / private mode — non-fatal.
  }
}

/** Read a staged draft if one exists and is within TTL; returns null otherwise. */
export function readPreview<T>(kind: PreviewKind, id: string): T | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(keyFor(kind, id));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || typeof env.at !== 'number') return null;
    if (Date.now() - env.at > TTL_MS) {
      s.removeItem(keyFor(kind, id));
      return null;
    }
    return env.data;
  } catch {
    return null;
  }
}

/** Cheap existence check — used by the PreviewBanner to decide whether to render. */
export function hasStagedPreview(kind: PreviewKind, id: string): boolean {
  return readPreview(kind, id) !== null;
}

/** Any staged draft of any kind — used by the PreviewBanner when the
 *  specific kind/id isn't known (e.g. a generic `?preview=1` visit). */
export function hasAnyStagedPreview(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    gc();
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(`${PREFIX}:`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Clear a single staged draft. */
export function clearPreview(kind: PreviewKind, id: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(keyFor(kind, id));
  } catch {
    // ignore
  }
}

/** Clear every staged draft — used by the Exit-preview button. */
export function clearAllPreviews(): void {
  const s = storage();
  if (!s) return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(`${PREFIX}:`)) toRemove.push(k);
    }
    for (const k of toRemove) s.removeItem(k);
  } catch {
    // ignore
  }
}

/** True iff the current URL has `?preview=1`. Safe to call during SSR. */
export function isPreviewMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === '1';
  } catch {
    return false;
  }
}

/** Convenience: compute the public URL for a given content kind + id. */
export function publicPathForKind(kind: PreviewKind, id: string): string {
  switch (kind) {
    case 'article':
      return `/learn/articles/${encodeURIComponent(id)}`;
    case 'page':
      return `/${encodeURIComponent(id)}`;
    case 'siteSetting':
      return siteSettingPath(id);
    case 'faq':
      return '/faq';
    case 'resource':
      return '/resources';
    case 'channel':
      return '/social';
    case 'series':
      return '/learn';
    case 'topic':
      return '/learn/articles';
    default:
      return '/';
  }
}

function siteSettingPath(id: string): string {
  switch (id) {
    case 'hero':
    case 'aboutPreview':
    case 'startHere':
    case 'footer':
    case 'quranBanner':
      return '/';
    case 'learnHeader':
      return '/learn';
    case 'articlesHeader':
      return '/learn/articles';
    case 'quranAbout':
      return '/quran';
    default:
      return '/';
  }
}
