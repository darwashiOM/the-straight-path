/**
 * Preview library — lightweight sessionStorage-backed staging for the admin
 * live-preview flow.
 *
 * Flow:
 *   1. An editor calls `stagePreview(kind, id, draft)` with the in-progress
 *      form state before opening a new tab pointing at the public URL with
 *      `?preview=1` appended.
 *   2. The public page's content loader calls `isPreviewMode()`; if true (and
 *      the viewer is an authenticated admin — that gate lives in the hook),
 *      it reads the staged draft via `readPreview()` and uses it instead of
 *      Firestore.
 *
 * Staging lives in `sessionStorage` so drafts never leak across tabs sessions
 * or to non-admin visitors. Keys are namespaced as
 * `tsp:preview:<kind>:<id>` to avoid collisions.
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

function keyFor(kind: PreviewKind, id: string): string {
  return `${PREFIX}:${kind}:${id}`;
}

function canUseSessionStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.sessionStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Stage a draft for preview. Silently no-ops when sessionStorage is unavailable. */
export function stagePreview(kind: PreviewKind, id: string, data: unknown): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(keyFor(kind, id), JSON.stringify(data));
  } catch {
    // Quota exhausted / private mode — non-fatal.
  }
}

/** Read a staged draft if one exists; returns null otherwise. */
export function readPreview<T>(kind: PreviewKind, id: string): T | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(keyFor(kind, id));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Clear a single staged draft. */
export function clearPreview(kind: PreviewKind, id: string): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(keyFor(kind, id));
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
