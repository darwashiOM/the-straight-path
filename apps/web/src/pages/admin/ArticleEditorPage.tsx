/**
 * ArticleEditorPage (V2) — side-by-side English + Arabic editor for the new
 * nested-translations article schema.
 *
 * Layout:
 *   - Left column (sticky): structured, non-translated fields — slug, status,
 *     dates, author, topic, series, tags, hero image, delete.
 *   - Right column: locale tabs (EN / AR). Each tab has title + excerpt +
 *     markdown body + live preview.
 *   - Bottom: sticky save bar (Save draft / Publish).
 */
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Eye, ImageIcon, Save, Send, Trash2 } from 'lucide-react';

import MediaPicker from '@/components/admin/MediaPicker';

import {
  deleteArticleV2,
  getArticleV2,
  listSeries,
  listTopics,
  saveArticleV2,
} from '@/lib/admin-firestore';
import type { ArticleDoc, ArticleStatus, Locale } from '@/lib/content-schema';
import { stagePreview } from '@/lib/preview';
import { articles as mdxArticles } from '@/content/articles';
import LocaleTabs from '@/components/admin/LocaleTabs';
import MarkdownPreview from '@/components/admin/MarkdownPreview';
import TagInput from '@/components/admin/TagInput';

type LocaleFields = { title: string; excerpt: string; body: string };

interface FormState {
  slug: string;
  status: ArticleStatus;
  publishedAt: string;
  scheduledAt: string;
  author: string;
  tags: string[];
  topic: string;
  series: string;
  heroImage: string;
  en: LocaleFields;
  ar: LocaleFields;
  arEnabled: boolean;
}

const EMPTY_LOCALE: LocaleFields = { title: '', excerpt: '', body: '' };

const EMPTY: FormState = {
  slug: '',
  status: 'draft',
  publishedAt: new Date().toISOString().slice(0, 10),
  scheduledAt: '',
  author: 'The Straight Path',
  tags: [],
  topic: '',
  series: '',
  heroImage: '',
  en: { ...EMPTY_LOCALE },
  ar: { ...EMPTY_LOCALE },
  arEnabled: false,
};

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

export default function ArticleEditorPage() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ['admin', 'articleV2', params.id],
    enabled: !isNew,
    queryFn: () => getArticleV2(params.id as string),
  });

  const topics = useQuery({ queryKey: ['admin', 'topics'], queryFn: listTopics });
  const series = useQuery({ queryKey: ['admin', 'series'], queryFn: listSeries });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugDirty, setSlugDirty] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const mdxConflict = useMemo(
    () => mdxArticles.some((a) => a.frontmatter.slug === form.slug),
    [form.slug],
  );

  useEffect(() => {
    if (!isNew && existing.data) {
      const d = existing.data;
      setForm({
        slug: d.slug,
        status: d.status,
        publishedAt: d.publishedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        scheduledAt: d.scheduledAt?.slice(0, 10) ?? '',
        author: d.author ?? 'The Straight Path',
        tags: d.tags ?? [],
        topic: d.topic ?? '',
        series: d.series ?? '',
        heroImage: d.heroImage ?? '',
        en: {
          title: d.translations.en?.title ?? '',
          excerpt: d.translations.en?.excerpt ?? '',
          body: d.translations.en?.body ?? '',
        },
        ar: d.translations.ar
          ? {
              title: d.translations.ar.title ?? '',
              excerpt: d.translations.ar.excerpt ?? '',
              body: d.translations.ar.body ?? '',
            }
          : { ...EMPTY_LOCALE },
        arEnabled: Boolean(d.translations.ar),
      });
      setSlugDirty(true);
    }
  }, [isNew, existing.data]);

  // Auto-derive slug from EN title until the user edits it.
  useEffect(() => {
    if (isNew && !slugDirty) {
      setForm((f) => ({ ...f, slug: slugify(f.en.title) }));
    }
  }, [form.en.title, isNew, slugDirty]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function patchLocale(which: Locale, fields: Partial<LocaleFields>) {
    setForm((f) => ({ ...f, [which]: { ...f[which], ...fields } }));
  }

  function copyEnToAr(fields: Array<keyof LocaleFields>) {
    setForm((f) => {
      const next = { ...f.ar };
      for (const field of fields) next[field] = f.en[field];
      return { ...f, ar: next, arEnabled: true };
    });
  }

  function buildPayload(status: ArticleStatus): ArticleDoc {
    return {
      slug: form.slug,
      status,
      publishedAt: form.publishedAt,
      ...(status === 'scheduled' && form.scheduledAt ? { scheduledAt: form.scheduledAt } : {}),
      author: form.author,
      tags: form.tags,
      ...(form.topic ? { topic: form.topic } : {}),
      ...(form.series ? { series: form.series } : {}),
      ...(form.heroImage ? { heroImage: form.heroImage } : {}),
      translations: {
        en: { ...form.en },
        ...(form.arEnabled && (form.ar.title || form.ar.body || form.ar.excerpt)
          ? { ar: { ...form.ar } }
          : {}),
      },
      schemaVersion: 1,
    };
  }

  function handlePreview() {
    if (!form.slug) {
      setError('Slug is required to preview.');
      return;
    }
    setError(null);
    stagePreview('article', form.slug, buildPayload(form.status));
    window.open(
      `/learn/articles/${encodeURIComponent(form.slug)}?preview=1`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function submit(e: FormEvent | null, nextStatus?: ArticleStatus) {
    e?.preventDefault();
    setError(null);
    if (!form.slug) {
      setError('Slug is required.');
      return;
    }
    if (!form.en.title.trim()) {
      setError('English title is required.');
      return;
    }
    setSaving(true);
    try {
      const status = nextStatus ?? form.status;
      const payload: ArticleDoc = buildPayload(status);
      await saveArticleV2(form.slug, payload);
      await qc.invalidateQueries({ queryKey: ['admin', 'articlesV2'] });
      await qc.invalidateQueries({ queryKey: ['admin', 'articleV2', form.slug] });
      await qc.invalidateQueries({ queryKey: ['public', 'articles'] });
      if (isNew) {
        navigate(`/admin/articles/${encodeURIComponent(form.slug)}`, { replace: true });
      } else if (nextStatus) {
        patch('status', nextStatus);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!params.id) return;
    if (!window.confirm('Delete this article? This cannot be undone.')) return;
    await deleteArticleV2(params.id);
    await qc.invalidateQueries({ queryKey: ['admin', 'articlesV2'] });
    navigate('/admin/articles');
  }

  if (!isNew && existing.isLoading) {
    return <div className="text-sm text-ink/60">Loading…</div>;
  }

  const active = form[locale];
  const arMissing = !form.arEnabled || !(form.ar.title || form.ar.body);

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 pb-20">
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentUrl={form.heroImage || undefined}
        onPick={(url) => {
          patch('heroImage', url);
          setPickerOpen(false);
        }}
      />
      <div className="flex items-center justify-between">
        <Link
          to="/admin/articles"
          className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>
        <div className="text-xs text-ink/50">
          {isNew ? 'New article' : `Editing ${form.slug}`}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-sienna/30 bg-sienna/5 px-3 py-2 text-sm text-sienna"
        >
          {error}
        </div>
      )}

      {mdxConflict && (
        <div className="rounded-lg border border-accent-300 bg-accent-50/60 px-3 py-2 text-sm text-accent-700">
          This slug matches an MDX file in the repo. Saving will create a Firestore
          override that takes priority on the public site.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ---------- Left: structured fields (sticky) ---------- */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4 rounded-xl border border-primary-100 bg-white p-5 shadow-sm">
            <h2 className="font-serif text-lg text-primary-700">Article fields</h2>

            <Field label="Slug" hint="URL path: /learn/articles/<slug>">
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugDirty(true);
                  patch('slug', slugify(e.target.value));
                }}
                className={`${inputCls} font-mono text-xs`}
                disabled={!isNew}
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => patch('status', e.target.value as ArticleStatus)}
                className={inputCls}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </Field>

            <Field label="Publish date">
              <input
                type="date"
                value={form.publishedAt}
                onChange={(e) => patch('publishedAt', e.target.value)}
                className={inputCls}
              />
            </Field>

            {form.status === 'scheduled' && (
              <Field label="Scheduled for">
                <input
                  type="date"
                  value={form.scheduledAt}
                  onChange={(e) => patch('scheduledAt', e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}

            <Field label="Author">
              <input
                type="text"
                value={form.author}
                onChange={(e) => patch('author', e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Topic">
              <select
                value={form.topic}
                onChange={(e) => patch('topic', e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {(topics.data ?? []).map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.translations?.en?.label ?? t.slug}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Series">
              <select
                value={form.series}
                onChange={(e) => patch('series', e.target.value)}
                className={inputCls}
              >
                <option value="">—</option>
                {(series.data ?? []).map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.translations?.en?.title ?? s.slug}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tags" hint="Press Enter or comma to add.">
              <TagInput
                value={form.tags}
                onChange={(tags) => patch('tags', tags)}
                placeholder="e.g. creed, qur'an"
              />
            </Field>

            <Field label="Hero image">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.heroImage}
                  onChange={(e) => patch('heroImage', e.target.value)}
                  className={inputCls}
                  placeholder="https://…"
                />
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary-100 bg-white px-3 text-xs font-medium text-primary-700 hover:border-primary-300 hover:bg-primary-50"
                  title="Pick from library"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Library
                </button>
              </div>
              {form.heroImage ? (
                <div className="mt-2 overflow-hidden rounded-md border border-primary-100">
                  <img
                    src={form.heroImage}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : null}
            </Field>

            {!isNew && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-sienna/30 px-3 py-1.5 text-sm text-sienna hover:bg-sienna/5"
              >
                <Trash2 className="h-4 w-4" />
                Delete article
              </button>
            )}
          </div>
        </aside>

        {/* ---------- Right: locale tabs + editor ---------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <LocaleTabs
              locale={locale}
              onChange={setLocale}
              arBadge={arMissing ? <span className="text-accent-700">missing</span> : null}
            />
            {locale === 'ar' && (
              <div className="flex items-center gap-2">
                {!form.arEnabled && (
                  <button
                    type="button"
                    onClick={() => patch('arEnabled', true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
                  >
                    Enable Arabic
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copyEnToAr(['title', 'excerpt'])}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
                  title="Copy English title + excerpt into Arabic"
                >
                  <Copy className="h-3 w-3" />
                  Copy EN → AR (title+excerpt)
                </button>
                <button
                  type="button"
                  onClick={() => copyEnToAr(['title', 'excerpt', 'body'])}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
                >
                  <Copy className="h-3 w-3" />
                  Copy all
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-primary-100 bg-white p-5 shadow-sm">
              <Field label={`Title (${locale.toUpperCase()})`}>
                <input
                  type="text"
                  required={locale === 'en'}
                  value={active.title}
                  onChange={(e) => patchLocale(locale, { title: e.target.value })}
                  className={inputCls}
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                  lang={locale}
                />
              </Field>

              <Field label="Excerpt" hint="1–2 sentence summary used in listings and SEO.">
                <textarea
                  value={active.excerpt}
                  onChange={(e) => patchLocale(locale, { excerpt: e.target.value })}
                  rows={3}
                  className={inputCls}
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                  lang={locale}
                />
              </Field>

              <Field label="Body (Markdown)">
                <textarea
                  value={active.body}
                  onChange={(e) => patchLocale(locale, { body: e.target.value })}
                  rows={24}
                  className={`${inputCls} font-mono text-xs leading-relaxed`}
                  placeholder="# Heading&#10;&#10;Your essay…"
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                  lang={locale}
                />
              </Field>
            </div>

            <div className="rounded-xl border border-primary-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-lg text-primary-700">Preview</h3>
                <span className="text-xs text-ink/50">Live · {locale.toUpperCase()}</span>
              </div>
              <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
                {active.title && (
                  <h1 className="mb-1 font-serif text-2xl text-primary-700">{active.title}</h1>
                )}
                {active.excerpt && <p className="mb-4 text-sm text-ink/70">{active.excerpt}</p>}
                <MarkdownPreview source={active.body} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Sticky save bar ---------- */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-primary-100 bg-white/95 px-6 py-3 shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2">
          <span className="mr-auto text-xs text-ink/50">
            Status: <span className="font-medium text-ink/80">{form.status}</span>
          </span>
          <button
            type="button"
            onClick={handlePreview}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            title="Open the public page with unsaved changes"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => void submit(null, 'draft')}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-sm text-primary-700 hover:bg-primary-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            onClick={() => void submit(null)}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-sm text-primary-700 hover:bg-primary-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            type="button"
            onClick={() => void submit(null, 'published')}
            disabled={saving}
            className="btn bg-primary-500 px-4 py-2 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      </div>
    </form>
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
      <span className="block text-sm font-medium text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}
