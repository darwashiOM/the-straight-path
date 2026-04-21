import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Send, Trash2 } from 'lucide-react';

import {
  type AdminArticle,
  type ArticleLocale,
  type ArticleStatus,
  deleteArticle,
  getArticle,
  saveArticle,
} from '@/lib/admin-firestore';
import { articles as mdxArticles } from '@/content/articles';
import MarkdownPreview from '@/components/admin/MarkdownPreview';
import TagInput from '@/components/admin/TagInput';

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

type FormState = Omit<AdminArticle, 'id' | 'createdAt' | 'updatedAt'>;

const EMPTY: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  status: 'draft',
  locale: 'en',
  author: 'The Straight Path',
  tags: [],
  heroImage: '',
  publishedAt: new Date().toISOString().slice(0, 10),
};

export default function ArticleEditorPage() {
  const params = useParams<{ id?: string }>();
  const isNew = !params.id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ['admin', 'article', params.id],
    enabled: !isNew,
    queryFn: () => getArticle(params.id as string),
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugDirty, setSlugDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whether this slug collides with an MDX article (read-only territory).
  const mdxConflict = useMemo(
    () => mdxArticles.some((a) => a.frontmatter.slug === form.slug),
    [form.slug],
  );

  useEffect(() => {
    if (!isNew && existing.data) {
      const d = existing.data;
      setForm({
        title: d.title ?? '',
        slug: d.slug ?? d.id ?? '',
        excerpt: d.excerpt ?? '',
        body: d.body ?? '',
        status: d.status ?? 'draft',
        locale: d.locale ?? 'en',
        author: d.author ?? 'The Straight Path',
        tags: d.tags ?? [],
        heroImage: d.heroImage ?? '',
        publishedAt: d.publishedAt ?? new Date().toISOString().slice(0, 10),
      });
      setSlugDirty(true);
    }
  }, [isNew, existing.data]);

  // Auto-generate slug from title until the user edits it manually.
  useEffect(() => {
    if (isNew && !slugDirty) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, isNew, slugDirty]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent, nextStatus?: ArticleStatus) {
    e.preventDefault();
    setError(null);
    if (!form.slug) {
      setError('Slug is required.');
      return;
    }
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: FormState = nextStatus ? { ...form, status: nextStatus } : form;
      await saveArticle(form.slug, payload, isNew);
      await qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
      await qc.invalidateQueries({ queryKey: ['public', 'articles'] });
      if (isNew) {
        navigate(`/admin/articles/${encodeURIComponent(form.slug)}`, { replace: true });
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
    await deleteArticle(params.id);
    await qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
    navigate('/admin/articles');
  }

  if (!isNew && existing.isLoading) {
    return <div className="text-sm text-ink/60">Loading…</div>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          to="/admin/articles"
          className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-1 rounded-lg border border-sienna/30 px-3 py-1.5 text-sm text-sienna hover:bg-sienna/5"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={(e) => void submit(e, 'draft')}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-sm text-primary-700 hover:bg-primary-50"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            onClick={(e) => void submit(e, 'published')}
            disabled={saving}
            className="btn bg-primary-500 px-4 py-2 text-white hover:bg-primary-600"
          >
            <Send className="h-4 w-4" />
            {saving ? 'Saving…' : 'Publish'}
          </button>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-primary-100 bg-white p-5 shadow-sm">
          <Field label="Title">
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => patch('title', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Slug" hint="Auto-generated from title. URL path: /learn/articles/<slug>">
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

          <Field label="Excerpt" hint="1–2 sentence summary used in listings and SEO.">
            <textarea
              value={form.excerpt}
              onChange={(e) => patch('excerpt', e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => patch('status', e.target.value as ArticleStatus)}
                className={inputCls}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </Field>
            <Field label="Locale">
              <select
                value={form.locale}
                onChange={(e) => patch('locale', e.target.value as ArticleLocale)}
                className={inputCls}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author">
              <input
                type="text"
                value={form.author}
                onChange={(e) => patch('author', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Publish date">
              <input
                type="date"
                value={form.publishedAt?.slice(0, 10) ?? ''}
                onChange={(e) => patch('publishedAt', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Hero image URL" hint="Optional. Absolute URL or /path/to/image.webp">
            <input
              type="url"
              value={form.heroImage ?? ''}
              onChange={(e) => patch('heroImage', e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>

          <Field label="Tags" hint="Press Enter or comma to add.">
            <TagInput
              value={form.tags}
              onChange={(tags) => patch('tags', tags)}
              placeholder="e.g. creed, qur'an"
            />
          </Field>

          <Field label="Body (Markdown)">
            <textarea
              value={form.body}
              onChange={(e) => patch('body', e.target.value)}
              rows={20}
              className={`${inputCls} font-mono text-xs leading-relaxed`}
              placeholder="# Heading&#10;&#10;Your essay…"
            />
          </Field>
        </div>

        <aside className="rounded-xl border border-primary-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-lg text-primary-700">Preview</h2>
            <span className="text-xs text-ink/50">Live</span>
          </div>
          {form.title && (
            <h1 className="mb-1 font-serif text-2xl text-primary-700">{form.title}</h1>
          )}
          {form.excerpt && <p className="mb-4 text-sm text-ink/70">{form.excerpt}</p>}
          <MarkdownPreview source={form.body} />
        </aside>
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
