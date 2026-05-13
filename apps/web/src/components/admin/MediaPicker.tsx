/**
 * MediaPicker — a dialog that opens from any editor field and lets the admin
 * pick an image from the Firebase-Storage-backed media library or paste/upload
 * a new one on the fly.
 *
 * Contract: `onPick(url)` fires once the user selects an image. The parent
 * decides what to do with that URL (usually `setState` for the form).
 *
 * Upload-here flow: there's a small file-picker + alt input inside the dialog
 * so editors don't have to leave the page to seed the library with a new
 * image. Delegates to `uploadMedia` so rules + token refresh + the
 * `/media/{id}` index doc all stay consistent.
 */
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Link2, Upload, X } from 'lucide-react';

import { listMedia, uploadMedia, StorageNotConfiguredError } from '@/lib/media';
import type { MediaDoc } from '@/lib/content-schema';

interface MediaPickerProps {
  /** Opens the dialog when true. Controlled by the caller. */
  open: boolean;
  /** Caller closes the dialog. */
  onClose: () => void;
  /** Fires with the selected image URL. Caller closes the dialog after. */
  onPick: (url: string) => void;
  /** Optional initial URL — used to show the current selection in the header. */
  currentUrl?: string;
}

export default function MediaPicker({ open, onClose, onPick, currentUrl }: MediaPickerProps) {
  const qc = useQueryClient();
  const {
    data: media,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'media'],
    queryFn: listMedia,
    enabled: open,
    staleTime: 30_000,
  });

  const [manualUrl, setManualUrl] = useState<string>('');
  const [uploadAlt, setUploadAlt] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const storageNotConfigured = error instanceof StorageNotConfiguredError;

  async function doUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await uploadMedia(file, uploadAlt || file.name);
      setUploadAlt('');
      if (fileRef.current) fileRef.current.value = '';
      await qc.invalidateQueries({ queryKey: ['admin', 'media'] });
      onPick(doc.url);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
      className="bg-ink/40 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-primary-100 bg-paper flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-xl">
        <header className="border-primary-100 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 id="media-picker-title" className="text-primary-700 font-serif text-xl">
              Pick an image
            </h2>
            <p className="text-ink/60 mt-0.5 text-xs">
              Select from the library, paste a URL, or upload a new file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/50 hover:bg-primary-50 hover:text-primary-700 rounded-md p-1"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-4 overflow-hidden p-5 md:grid-cols-[1fr_16rem]">
          {/* Library grid */}
          <div className="min-h-0 overflow-auto">
            {storageNotConfigured ? (
              <div className="border-accent-300/60 bg-accent-50 text-accent-900 rounded-xl border p-5 text-sm">
                <p className="font-semibold">Firebase Storage isn&rsquo;t enabled yet.</p>
                <p className="text-accent-900/80 mt-1">
                  Open the{' '}
                  <a
                    href="https://console.firebase.google.com/project/the-straight-path-tsp/storage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Firebase Storage console
                  </a>{' '}
                  and click <em>Get started</em>, then come back and retry. You can still paste a
                  direct URL on the right.
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="border-accent-500 text-accent-700 hover:bg-accent-100 mt-3 rounded-md border bg-white px-3 py-1.5 text-xs font-medium"
                >
                  I&rsquo;ve enabled it — retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="bg-primary-100/40 aspect-square animate-pulse rounded-lg"
                  />
                ))}
              </div>
            ) : media && media.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {media.map((m: MediaDoc) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onPick(m.url)}
                      className={`group relative block h-full w-full overflow-hidden rounded-lg border bg-white text-left transition ${
                        currentUrl === m.url
                          ? 'border-accent-500 shadow-md'
                          : 'border-primary-100 hover:border-primary-300 hover:shadow-sm'
                      }`}
                      title={m.alt || m.path}
                    >
                      <img
                        src={m.url}
                        alt={m.alt || ''}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {m.alt || m.path}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-primary-200 text-ink/60 flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm">
                <ImageIcon className="text-ink/30 h-8 w-8" />
                <p>No images in the library yet.</p>
                <p className="text-xs">Upload one on the right, or paste a URL.</p>
              </div>
            )}
          </div>

          {/* Sidebar: manual URL + upload */}
          <aside className="border-primary-100 flex flex-col gap-4 border-t pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <section>
              <h3 className="text-ink/60 text-xs font-semibold uppercase tracking-wide">
                Use a URL
              </h3>
              <div className="mt-2 flex gap-2">
                <div className="border-primary-100 focus-within:border-primary-300 flex flex-1 items-center gap-2 rounded-md border bg-white px-2">
                  <Link2 className="text-ink/40 h-4 w-4 shrink-0" />
                  <input
                    type="url"
                    placeholder="https://…"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="w-full bg-transparent py-1.5 text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = manualUrl.trim();
                    if (url) onPick(url);
                  }}
                  disabled={!manualUrl.trim()}
                  className="border-primary-500 bg-primary-500 hover:bg-primary-600 rounded-md border px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  Use
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-ink/60 text-xs font-semibold uppercase tracking-wide">
                Upload a new file
              </h3>
              <label className="text-ink/70 mt-2 block text-xs">
                Alt text (required)
                <input
                  type="text"
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  placeholder="Describe the image"
                  className="border-primary-100 focus:border-primary-300 mt-1 w-full rounded-md border bg-white px-2 py-1 text-sm focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !uploadAlt.trim()}
                className="border-primary-500 text-primary-700 hover:bg-primary-50 mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading…' : 'Choose file'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void doUpload(f);
                }}
              />
              {uploadError ? <p className="text-sienna mt-2 text-xs">{uploadError}</p> : null}
            </section>

            {currentUrl ? (
              <section className="border-primary-100 mt-auto border-t pt-3">
                <h3 className="text-ink/60 text-xs font-semibold uppercase tracking-wide">
                  Currently
                </h3>
                <div className="border-primary-100 mt-2 overflow-hidden rounded-md border bg-white">
                  <img src={currentUrl} alt="" className="aspect-video w-full object-cover" />
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
