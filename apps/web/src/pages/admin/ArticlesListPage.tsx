/**
 * ArticlesListPage (V2) — table of every Firestore article using the new
 * nested-translations schema. Each row links to the editor; a sticky
 * "New article" button sits at the top.
 */
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2 } from 'lucide-react';

import { deleteArticleV2, listArticlesV2 } from '@/lib/admin-firestore';
import { articles as mdxArticles } from '@/content/articles';

export default function ArticlesListPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'articlesV2'],
    queryFn: listArticlesV2,
  });

  const fsBySlug = new Map((data ?? []).map((a) => [a.slug, a]));
  const mdxOnly = mdxArticles.map((a) => a.frontmatter).filter((fm) => !fsBySlug.has(fm.slug));

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this article? This cannot be undone.')) return;
    await deleteArticleV2(id);
    await qc.invalidateQueries({ queryKey: ['admin', 'articlesV2'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-ink/70 text-sm">
          Firestore articles with English + Arabic variants. MDX files in the repo are listed for
          reference only.
        </p>
        <Link
          to="/admin/articles/new"
          className="btn bg-primary-500 hover:bg-primary-600 text-white"
        >
          <Plus className="h-4 w-4" />
          New article
        </Link>
      </div>

      <div className="border-primary-100 overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-primary-700 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Title (EN)</th>
              <th className="px-4 py-3">Title (AR)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-primary-100 divide-y">
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-ink/50 px-4 py-6 text-center">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && mdxOnly.length === 0 && (
              <tr>
                <td colSpan={8} className="text-ink/50 px-4 py-6 text-center">
                  No articles yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((a) => {
              const enTitle = a.translations?.en?.title ?? '';
              const arTitle = a.translations?.ar?.title ?? '';
              return (
                <tr key={a.id} className="hover:bg-primary-50/30">
                  <td className="text-ink/60 px-4 py-3 font-mono text-xs">
                    <Link
                      to={`/admin/articles/${encodeURIComponent(a.id)}`}
                      className="hover:text-primary-700"
                    >
                      {a.slug}
                    </Link>
                  </td>
                  <td className="text-ink px-4 py-3 font-medium">
                    <Link
                      to={`/admin/articles/${encodeURIComponent(a.id)}`}
                      className="hover:text-primary-700"
                    >
                      {enTitle || '(untitled)'}
                    </Link>
                  </td>
                  <td
                    className="text-ink/70 px-4 py-3"
                    dir={arTitle ? 'rtl' : undefined}
                    lang={arTitle ? 'ar' : undefined}
                  >
                    {arTitle || <span className="text-ink/40">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="text-ink/60 px-4 py-3 text-xs">
                    {a.publishedAt?.slice(0, 10) || '—'}
                  </td>
                  <td className="text-ink/60 px-4 py-3 text-xs">{a.topic || '—'}</td>
                  <td className="text-ink/60 px-4 py-3 text-xs">
                    {(a.tags ?? []).slice(0, 3).join(', ')}
                    {(a.tags ?? []).length > 3 ? ` +${(a.tags ?? []).length - 3}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void handleDelete(a.id)}
                      className="text-sienna hover:text-sienna/80 inline-flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {mdxOnly.map((fm) => (
              <tr key={fm.slug} className="bg-paper/50">
                <td className="text-ink/60 px-4 py-3 font-mono text-xs">{fm.slug}</td>
                <td className="text-ink/80 px-4 py-3 font-medium" colSpan={2}>
                  <span className="inline-flex items-center gap-2">
                    <FileText className="text-ink/40 h-3 w-3" />
                    {fm.title}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-primary-100 text-primary-700 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                    {fm.draft ? 'draft' : 'published'}
                  </span>
                </td>
                <td className="text-ink/60 px-4 py-3 text-xs" colSpan={3}>
                  MDX source — edit in git
                </td>
                <td className="text-ink/50 px-4 py-3 text-right text-xs italic">repo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: 'draft' | 'scheduled' | 'published' }) {
  const cls =
    status === 'published'
      ? 'bg-sage/10 text-sage'
      : status === 'scheduled'
        ? 'bg-primary-100 text-primary-700'
        : 'bg-accent-100 text-accent-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
