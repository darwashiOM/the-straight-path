/**
 * PagesAdminPage — a tiny surface for the three fixed editorial pages:
 * About, Privacy, Terms. Each has an EN + optional AR translation with
 * a markdown body and live preview.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Eye, FileText, Save, X } from 'lucide-react';

import { getPageAdmin, savePage, type PageSlug } from '@/lib/admin-editorial';
import MarkdownPreview from '@/components/admin/MarkdownPreview';
import type { PageDoc } from '@/lib/content-schema';
import { stagePreview } from '@/lib/preview';

const CARDS: Array<{ slug: PageSlug; title: string; blurb: string }> = [
  {
    slug: 'about',
    title: 'About',
    blurb: 'The mission statement and intro page visible in the site footer.',
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    blurb: 'How visitor data is handled. Required for legal coverage.',
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    blurb: 'The rules visitors agree to when using the site.',
  },
];

export default function PagesAdminPage() {
  const [openSlug, setOpenSlug] = useState<PageSlug | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg text-primary-700">Editorial pages</h2>
        <p className="mt-1 text-sm text-ink/60">
          Static long-form pages. Body is markdown; preview is live.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <button
            key={card.slug}
            type="button"
            onClick={() => setOpenSlug(card.slug)}
            className="group flex flex-col items-start gap-3 rounded-xl border border-primary-100 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif text-base text-primary-700">{card.title}</div>
              <div className="mt-1 text-sm text-ink/60">{card.blurb}</div>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary-600 group-hover:text-primary-700">
              Edit
              <ChevronRight className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>

      {openSlug && (
        <PageEditor slug={openSlug} onClose={() => setOpenSlug(null)} />
      )}
    </div>
  );
}

function PageEditor({ slug, onClose }: { slug: PageSlug; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'page', slug],
    queryFn: () => getPageAdmin(slug),
  });

  const card = CARDS.find((c) => c.slug === slug)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-primary-100 px-6 py-4">
          <div>
            <h3 className="font-serif text-lg text-primary-700">{card.title}</h3>
            <p className="text-xs text-ink/60">
              /{slug} — edit EN and (optional) AR side-by-side.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink/50 hover:bg-primary-50 hover:text-primary-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-sm text-ink/60">Loading…</div>
          ) : (
            <PageForm
              slug={slug}
              initial={data ?? null}
              onSaved={async () => {
                await qc.invalidateQueries({ queryKey: ['admin', 'page', slug] });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface FormProps {
  slug: PageSlug;
  initial: (PageDoc & { id: string }) | null;
  onSaved: () => void | Promise<void>;
}

function PageForm({ slug, initial, onSaved }: FormProps) {
  const [enTitle, setEnTitle] = useState(initial?.translations.en.title ?? '');
  const [enBody, setEnBody] = useState(initial?.translations.en.body ?? '');
  const [arEnabled, setArEnabled] = useState(Boolean(initial?.translations.ar));
  const [arTitle, setArTitle] = useState(initial?.translations.ar?.title ?? '');
  const [arBody, setArBody] = useState(initial?.translations.ar?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    if (!enTitle.trim()) {
      setError('English title is required.');
      return;
    }
    setSaving(true);
    try {
      const data: PageDoc = {
        slug,
        translations: {
          en: { title: enTitle, body: enBody },
          ...(arEnabled && (arTitle.trim() || arBody.trim())
            ? { ar: { title: arTitle, body: arBody } }
            : {}),
        },
        schemaVersion: 1,
      };
      await savePage(slug, data);
      await onSaved();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* EN pane */}
        <section className="rounded-xl border border-primary-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              English
            </div>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-ink/80">Title</span>
            <input
              type="text"
              value={enTitle}
              onChange={(e) => setEnTitle(e.target.value)}
              required
              className={inputCls}
            />
          </label>
          <label className="mt-3 block">
            <span className="block text-sm font-medium text-ink/80">Body (Markdown)</span>
            <textarea
              value={enBody}
              onChange={(e) => setEnBody(e.target.value)}
              rows={18}
              className={`${inputCls} font-mono text-xs leading-relaxed`}
              placeholder="# Heading\n\nYour content…"
            />
          </label>
          <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/30 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
              Live preview
            </div>
            {enTitle && (
              <h1 className="mb-1 font-serif text-xl text-primary-700">{enTitle}</h1>
            )}
            <MarkdownPreview source={enBody} />
          </div>
        </section>

        {/* AR pane */}
        <section className="rounded-xl border border-primary-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Arabic
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-ink/70">
              <input
                type="checkbox"
                checked={arEnabled}
                onChange={(e) => setArEnabled(e.target.checked)}
              />
              Include Arabic translation
            </label>
          </div>
          <label className="block">
            <span className="block text-sm font-medium text-ink/80">Title</span>
            <input
              type="text"
              dir="rtl"
              value={arTitle}
              onChange={(e) => setArTitle(e.target.value)}
              disabled={!arEnabled}
              className={inputCls}
            />
          </label>
          <label className="mt-3 block">
            <span className="block text-sm font-medium text-ink/80">Body (Markdown)</span>
            <textarea
              dir="rtl"
              value={arBody}
              onChange={(e) => setArBody(e.target.value)}
              disabled={!arEnabled}
              rows={18}
              className={`${inputCls} font-mono text-xs leading-relaxed`}
            />
          </label>
          <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50/30 p-3" dir="rtl">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
              معاينة
            </div>
            {arTitle && (
              <h1 className="mb-1 font-serif text-xl text-primary-700">{arTitle}</h1>
            )}
            <MarkdownPreview source={arBody} />
          </div>
        </section>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-sienna/30 bg-sienna/5 px-3 py-2 text-sm text-sienna"
        >
          {error}
        </div>
      )}

      {saved && !error && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-700">
          Saved.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            const data: PageDoc = {
              slug,
              translations: {
                en: { title: enTitle, body: enBody },
                ...(arEnabled && (arTitle.trim() || arBody.trim())
                  ? { ar: { title: arTitle, body: arBody } }
                  : {}),
              },
              schemaVersion: 1,
            };
            stagePreview('page', slug, data);
            window.open(`/${slug}?preview=1`, '_blank', 'noopener,noreferrer');
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100"
          title="Open the public page with unsaved changes"
        >
          <Eye className="h-4 w-4" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="btn bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:bg-primary-50/60 disabled:text-ink/60';
