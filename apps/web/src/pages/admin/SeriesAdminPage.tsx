/**
 * SeriesAdminPage — list + dialog editor for /series/{slug} docs.
 *
 * Each series is a curated, ordered sequence of article slugs plus an
 * English title + description. Articles are picked from the V2 articles
 * collection (listArticlesV2). The dialog also allows manual slug entry
 * as a fallback.
 */
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';

import { deleteSeries, listSeries, saveSeries } from '@/lib/admin-editorial';
import { listArticlesV2, type AdminArticleV2 } from '@/lib/admin-firestore';
import type { SeriesDoc } from '@/lib/content-schema';

type Row = SeriesDoc & { id: string };

function emptySeries(): SeriesDoc {
  return {
    slug: '',
    order: 10,
    articleSlugs: [],
    translations: {
      en: { title: '', description: '' },
    },
    schemaVersion: 1,
  };
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function SeriesAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'series'],
    queryFn: listSeries,
  });

  const [editing, setEditing] = useState<Row | 'new' | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-primary-700 font-serif text-lg">Series</h2>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="btn bg-primary-500 hover:bg-primary-600 text-white"
        >
          <Plus className="h-4 w-4" />
          New series
        </button>
      </div>

      <div className="border-primary-100 overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-primary-700 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-primary-100 divide-y">
            {isLoading && (
              <tr>
                <td colSpan={5} className="text-ink/50 px-4 py-6 text-center">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="text-ink/50 px-4 py-6 text-center">
                  No series yet. Click “New series” to create your first.
                </td>
              </tr>
            )}
            {(data ?? []).map((row) => (
              <tr
                key={row.id}
                onClick={() => setEditing(row)}
                className="hover:bg-primary-50/30 cursor-pointer"
              >
                <td className="text-ink/70 px-4 py-3 font-mono text-xs">{row.slug}</td>
                <td className="text-ink/80 px-4 py-3">{row.translations.en.title}</td>
                <td className="text-ink/70 px-4 py-3">{row.articleSlugs?.length ?? 0}</td>
                <td className="text-ink/70 px-4 py-3">{row.order}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-primary-600 inline-flex items-center gap-1 text-xs">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <SeriesDialog
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ['admin', 'series'] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface DialogProps {
  initial: Row | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function SeriesDialog({ initial, onClose, onSaved }: DialogProps) {
  const qc = useQueryClient();
  const isNew = !initial;
  const [form, setForm] = useState<SeriesDoc>(() => initial ?? emptySeries());
  const [slugDirty, setSlugDirty] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from EN title while creating.
  useEffect(() => {
    if (isNew && !slugDirty) {
      setForm((f) => ({ ...f, slug: slugify(f.translations.en.title) }));
    }
  }, [form.translations.en.title, isNew, slugDirty]);

  // Article picker — tries listArticlesV2; degrades to text input if it fails.
  const articles = useQuery({
    queryKey: ['admin', 'articles', 'v2'],
    queryFn: listArticlesV2,
    // Don't block the whole dialog if the articles query errors.
    retry: false,
  });

  const availableArticles: AdminArticleV2[] = articles.data ?? [];

  const articleTitleBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of availableArticles) {
      m.set(a.slug, a.translations?.en?.title ?? a.slug);
    }
    return m;
  }, [availableArticles]);

  function setEn<K extends keyof SeriesDoc['translations']['en']>(
    key: K,
    value: SeriesDoc['translations']['en'][K],
  ) {
    setForm((f) => ({
      ...f,
      translations: { ...f.translations, en: { ...f.translations.en, [key]: value } },
    }));
  }

  function moveArticle(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.articleSlugs];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return f;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return { ...f, articleSlugs: next };
    });
  }
  function removeArticle(idx: number) {
    setForm((f) => ({
      ...f,
      articleSlugs: f.articleSlugs.filter((_, i) => i !== idx),
    }));
  }
  function addArticle(slug: string) {
    const trimmed = slug.trim();
    if (!trimmed) return;
    setForm((f) => {
      if (f.articleSlugs.includes(trimmed)) return f;
      return { ...f, articleSlugs: [...f.articleSlugs, trimmed] };
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.slug) {
      setError('Slug is required.');
      return;
    }
    if (!form.translations.en.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: SeriesDoc = {
        ...form,
        translations: {
          en: form.translations.en,
        },
      };
      await saveSeries(form.slug, payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    if (!window.confirm(`Delete series "${initial.slug}"? This cannot be undone.`)) return;
    await deleteSeries(initial.slug);
    await qc.invalidateQueries({ queryKey: ['admin', 'series'] });
    onClose();
  }

  const [manualSlug, setManualSlug] = useState('');
  const [pickerSlug, setPickerSlug] = useState('');

  const canUsePicker = articles.isSuccess && availableArticles.length > 0;

  return (
    <div className="bg-ink/40 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-primary-700 font-serif text-lg">
            {isNew ? 'New series' : `Edit series — ${initial?.slug}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/50 hover:bg-primary-50 hover:text-primary-700 rounded p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug" hint="Lowercase, hyphen-separated. Fixed after creation.">
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugDirty(true);
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                }}
                disabled={!isNew}
                className={`${inputCls} font-mono text-xs`}
              />
            </Field>
            <Field label="Order" hint="Smaller numbers appear first.">
              <input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    order: e.target.value === '' ? 0 : Number(e.target.value),
                  }))
                }
                className={inputCls}
              />
            </Field>
          </div>

          <div className="border-primary-100 space-y-3 rounded-lg border p-3">
            <Field label="Title">
              <input
                type="text"
                required
                value={form.translations.en.title}
                onChange={(e) => setEn('title', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.translations.en.description}
                onChange={(e) => setEn('description', e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="border-primary-100 rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-primary-700 text-sm font-semibold">Articles in this series</div>
              <div className="text-ink/50 text-xs">{form.articleSlugs.length} total</div>
            </div>

            {form.articleSlugs.length === 0 ? (
              <p className="text-ink/50 text-sm">
                No articles yet. Add one below — drag order is via the arrow buttons.
              </p>
            ) : (
              <ul className="divide-primary-100 border-primary-100 divide-y rounded border">
                {form.articleSlugs.map((slug, idx) => (
                  <li
                    key={`${slug}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-ink/60 font-mono text-xs">{slug}</div>
                      {articleTitleBySlug.get(slug) && (
                        <div className="text-ink/80 truncate text-sm">
                          {articleTitleBySlug.get(slug)}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveArticle(idx, -1)}
                        disabled={idx === 0}
                        className="text-ink/60 hover:bg-primary-50 rounded p-1 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveArticle(idx, 1)}
                        disabled={idx === form.articleSlugs.length - 1}
                        className="text-ink/60 hover:bg-primary-50 rounded p-1 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeArticle(idx)}
                        className="text-sienna hover:bg-sienna/5 rounded p-1"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 space-y-2">
              {canUsePicker ? (
                <div className="flex items-center gap-2">
                  <select
                    value={pickerSlug}
                    onChange={(e) => setPickerSlug(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— pick an article —</option>
                    {availableArticles
                      .filter((a) => !form.articleSlugs.includes(a.slug))
                      .map((a) => (
                        <option key={a.slug} value={a.slug}>
                          {a.translations?.en?.title ?? a.slug} ({a.slug})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (pickerSlug) {
                        addArticle(pickerSlug);
                        setPickerSlug('');
                      }
                    }}
                    className="border-primary-200 text-primary-700 hover:bg-primary-50 rounded-lg border px-3 py-1.5 text-sm"
                  >
                    Add
                  </button>
                </div>
              ) : (
                // TODO: replace with autocomplete once listArticlesV2 ships
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualSlug}
                    onChange={(e) => setManualSlug(e.target.value)}
                    placeholder="article-slug"
                    className={`${inputCls} font-mono text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      addArticle(manualSlug);
                      setManualSlug('');
                    }}
                    className="border-primary-200 text-primary-700 hover:bg-primary-50 rounded-lg border px-3 py-1.5 text-sm"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div>
              {!isNew && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="border-sienna/30 text-sienna hover:bg-sienna/5 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete series
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border-primary-100 text-ink/70 hover:bg-primary-50 rounded-lg border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn bg-primary-500 hover:bg-primary-600 text-white"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:bg-primary-50/60 disabled:text-ink/60';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-ink/80 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-ink/50 mt-1 block text-xs">{hint}</span>}
    </label>
  );
}
