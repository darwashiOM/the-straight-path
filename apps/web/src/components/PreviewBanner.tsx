/**
 * PreviewBanner — shown at the top of the public site when `?preview=1` is
 * present in the URL AND the viewer is an authenticated admin. Renders
 * nothing otherwise (keeps non-admins from ever seeing drafts).
 */
import { Eye, X } from 'lucide-react';

import { useIsAdmin } from '@/lib/auth';
import { clearAllPreviews, hasAnyStagedPreview, isPreviewMode } from '@/lib/preview';

export default function PreviewBanner() {
  const { isAdmin } = useIsAdmin();
  // Only render when the URL is in preview mode, the viewer is an admin,
  // AND there is actual staged content to preview. Missing any one of these
  // and the public page falls through to the live Firestore data as normal.
  if (!isPreviewMode() || !isAdmin || !hasAnyStagedPreview()) return null;

  function dismiss() {
    clearAllPreviews();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('preview');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
    window.location.reload();
  }

  return (
    <div className="sticky top-0 z-40 w-full border-b border-amber-300 bg-amber-100 text-amber-900 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium">Preview mode</span>
          <span className="text-amber-800/80">· unsaved changes</span>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-200/60 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-200"
          aria-label="Exit preview mode"
        >
          <X className="h-3.5 w-3.5" />
          Exit preview
        </button>
      </div>
    </div>
  );
}
