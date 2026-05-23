/**
 * MediaPage — admin media library.
 *
 * Upload tiles:
 *   - Drag-and-drop or click-to-pick. Alt text is required before the upload
 *     kicks off so every asset stays accessible.
 * Grid:
 *   - Thumbnail + alt + human-friendly size + delete button.
 *
 * If the Firebase Storage bucket hasn't been enabled yet, every upload will
 * throw `StorageNotConfiguredError`. We render a dedicated setup card instead
 * of blowing up the page, with a deep link to the Storage console and a
 * retry button that re-runs the list query.
 */
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';

import { deleteMedia, listMedia, StorageNotConfiguredError, uploadMedia } from '@/lib/media';
import type { MediaDoc } from '@/lib/content-schema';

const STORAGE_CONSOLE_URL =
  'https://console.firebase.google.com/project/the-straight-path-tsp/storage';

export default function MediaPage() {
  const qc = useQueryClient();
  const media = useQuery({
    queryKey: ['admin', 'media'],
    queryFn: listMedia,
  });

  const [alt, setAlt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canUpload = !!file && alt.trim().length > 0 && !uploading;

  const onPick = useCallback((next: File | null) => {
    setFile(next);
    setError(null);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onPick(f);
    },
    [onPick],
  );

  async function handleUpload() {
    if (!file || !alt.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await uploadMedia(file, alt.trim());
      setFile(null);
      setAlt('');
      if (inputRef.current) inputRef.current.value = '';
      await qc.invalidateQueries({ queryKey: ['admin', 'media'] });
    } catch (err) {
      if (err instanceof StorageNotConfiguredError) {
        setStorageUnavailable(true);
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this asset? This cannot be undone.')) return;
    try {
      await deleteMedia(id);
      await qc.invalidateQueries({ queryKey: ['admin', 'media'] });
    } catch (err) {
      if (err instanceof StorageNotConfiguredError) {
        setStorageUnavailable(true);
      } else {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    }
  }

  if (storageUnavailable) {
    return (
      <StorageSetupCard
        onRetry={async () => {
          setStorageUnavailable(false);
          setError(null);
          await qc.invalidateQueries({ queryKey: ['admin', 'media'] });
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-1">
        <h2 className="text-primary-700 font-serif text-lg">Media library</h2>
        <p className="text-ink/60 text-sm">
          Upload images used across the site. Alt text is required so assets stay accessible.
        </p>
      </header>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-6 transition-colors ${
          dragOver ? 'border-primary-400 bg-primary-50/60' : 'border-primary-200 bg-white'
        }`}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,260px)]">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-primary-50 text-primary-600 flex h-10 w-10 items-center justify-center rounded-lg">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="text-ink text-sm font-medium">
                  {file ? file.name : 'Drop an image here or click to choose'}
                </div>
                <div className="text-ink/50 text-xs">
                  {file
                    ? `${formatSize(file.size)} · ${file.type || 'unknown type'}`
                    : 'PNG, JPG, GIF, WebP, SVG up to 10 MB'}
                </div>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="text-ink/70 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 mt-3 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-medium"
              onChange={(e: ChangeEvent<HTMLInputElement>) => onPick(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="block">
              <span className="text-ink/80 block text-xs font-medium">Alt text (required)</span>
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Describe the image"
                className="border-primary-100 focus:border-primary-400 focus:ring-primary-400 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={!canUpload}
              className="bg-primary-500 hover:bg-primary-600 mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="border-sienna/30 bg-sienna/5 text-sienna mt-4 rounded-lg border px-3 py-2 text-sm"
          >
            {error}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-primary-700 font-serif text-base">
            Library{' '}
            <span className="text-ink/50 text-xs font-normal">({media.data?.length ?? 0})</span>
          </h3>
        </div>

        {media.isLoading ? (
          <div className="text-ink/60 text-sm">Loading…</div>
        ) : media.data && media.data.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {media.data.map((m) => (
              <MediaTile key={m.id} media={m} onDelete={() => void handleDelete(m.id)} />
            ))}
          </ul>
        ) : (
          <div className="border-primary-100 bg-primary-50/30 text-ink/60 rounded-xl border border-dashed p-8 text-center text-sm">
            <ImageIcon className="text-primary-400 mx-auto mb-2 h-6 w-6" />
            No media yet. Upload an image above to get started.
          </div>
        )}
      </section>
    </div>
  );
}

function MediaTile({ media, onDelete }: { media: MediaDoc; onDelete: () => void }) {
  const size = useMemo(() => formatSize(media.size ?? 0), [media.size]);
  return (
    <li className="border-primary-100 group overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="bg-primary-50/50 aspect-video w-full overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
        <img
          src={media.url}
          alt={media.alt || ''}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <div className="text-ink truncate text-sm font-medium" title={media.alt}>
          {media.alt || <span className="text-ink/50 italic">No alt text</span>}
        </div>
        <div className="text-ink/50 mt-0.5 flex items-center justify-between text-xs">
          <span className="truncate">{size}</span>
          <button
            type="button"
            onClick={onDelete}
            className="text-sienna hover:bg-sienna/10 inline-flex items-center gap-1 rounded p-1"
            aria-label="Delete media"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-1">
          <a
            href={media.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </li>
  );
}

function StorageSetupCard({ onRetry }: { onRetry: () => Promise<void> | void }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex-1">
          <h2 className="font-serif text-lg text-amber-900">Firebase Storage isn’t enabled yet</h2>
          <p className="mt-2 text-sm text-amber-900/80">
            The media library needs Firebase Storage to be initialised once from the Firebase
            Console. It’s a single click on the Spark plan and doesn’t cost anything until traffic
            shows up.
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-900/90">
            <li>
              Open the Storage console via the link below and click{' '}
              <span className="font-semibold">Get started</span>.
            </li>
            <li>Accept the default security rules — we override them on deploy anyway.</li>
            <li>
              Come back here and hit <span className="font-semibold">Retry</span>.
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={STORAGE_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
            >
              <ExternalLink className="h-4 w-4" />
              Open Firebase Storage
            </a>
            <button
              type="button"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                try {
                  await onRetry();
                } finally {
                  setRetrying(false);
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              I’ve enabled it, retry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
