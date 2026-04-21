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

export default function MediaPicker({
  open,
  onClose,
  onPick,
  currentUrl,
}: MediaPickerProps) {
  const qc = useQueryClient();
  const { data: media, isLoading, error, refetch } = useQuery({
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-primary-100 bg-paper shadow-xl">
        <header className="flex items-center justify-between border-b border-primary-100 bg-white px-5 py-4">
          <div>
            <h2
              id="media-picker-title"
              className="font-serif text-xl text-primary-700"
            >
              Pick an image
            </h2>
            <p className="mt-0.5 text-xs text-ink/60">
              Select from the library, paste a URL, or upload a new file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink/50 hover:bg-primary-50 hover:text-primary-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-4 overflow-hidden p-5 md:grid-cols-[1fr_16rem]">
          {/* Library grid */}
          <div className="min-h-0 overflow-auto">
            {storageNotConfigured ? (
              <div className="rounded-xl border border-accent-300/60 bg-accent-50 p-5 text-sm text-accent-900">
                <p className="font-semibold">Firebase Storage isn&rsquo;t enabled yet.</p>
                <p className="mt-1 text-accent-900/80">
                  Open the{' '}
                  <a
                    href="https://console.firebase.google.com/project/the-straight-path-tsp/storage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Firebase Storage console
                  </a>{' '}
                  and click <em>Get started</em>, then come back and retry. You can still
                  paste a direct URL on the right.
                </p>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 rounded-md border border-accent-500 bg-white px-3 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-100"
                >
                  I&rsquo;ve enabled it — retry
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-lg bg-primary-100/40"
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
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary-200 p-8 text-center text-sm text-ink/60">
                <ImageIcon className="h-8 w-8 text-ink/30" />
                <p>No images in the library yet.</p>
                <p className="text-xs">Upload one on the right, or paste a URL.</p>
              </div>
            )}
          </div>

          {/* Sidebar: manual URL + upload */}
          <aside className="flex flex-col gap-4 border-t border-primary-100 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                Use a URL
              </h3>
              <div className="mt-2 flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-md border border-primary-100 bg-white px-2 focus-within:border-primary-300">
                  <Link2 className="h-4 w-4 shrink-0 text-ink/40" />
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
                  className="rounded-md border border-primary-500 bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-40"
                >
                  Use
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                Upload a new file
              </h3>
              <label className="mt-2 block text-xs text-ink/70">
                Alt text (required)
                <input
                  type="text"
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  placeholder="Describe the image"
                  className="mt-1 w-full rounded-md border border-primary-100 bg-white px-2 py-1 text-sm focus:border-primary-300 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !uploadAlt.trim()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary-500 bg-white px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
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
              {uploadError ? (
                <p className="mt-2 text-xs text-sienna">{uploadError}</p>
              ) : null}
            </section>

            {currentUrl ? (
              <section className="mt-auto border-t border-primary-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Currently
                </h3>
                <div className="mt-2 overflow-hidden rounded-md border border-primary-100 bg-white">
                  <img
                    src={currentUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
