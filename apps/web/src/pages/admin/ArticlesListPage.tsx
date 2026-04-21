import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2 } from 'lucide-react';

import { deleteArticle, listArticles } from '@/lib/admin-firestore';
import { articles as mdxArticles } from '@/content/articles';

export default function ArticlesListPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'articles'],
    queryFn: listArticles,
  });

  const fsBySlug = new Map((data ?? []).map((a) => [a.slug, a]));
  const mdxOnly = mdxArticles
    .map((a) => a.frontmatter)
    .filter((fm) => !fsBySlug.has(fm.slug));

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this article? This cannot be undone.')) return;
    await deleteArticle(id);
    await qc.invalidateQueries({ queryKey: ['admin', 'articles'] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/70">
          Firestore articles are editable here. MDX articles live in the repo.
        </p>
        <Link
          to="/admin/articles/new"
          className="btn bg-primary-500 text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          New article
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-primary-700">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Locale</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && mdxOnly.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                  No articles yet.
                </td>
              </tr>
            )}
            {(data ?? []).map((a) => (
              <tr key={a.id} className="hover:bg-primary-50/30">
                <td className="px-4 py-3 font-medium text-ink">
                  <Link
                    to={`/admin/articles/${encodeURIComponent(a.id)}`}
                    className="hover:text-primary-700"
                  >
                    {a.title || '(untitled)'}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink/60">{a.slug}</td>
                <td className="px-4 py-3 text-ink/70">{a.locale}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.status === 'published'
                        ? 'bg-sage/10 text-sage'
                        : 'bg-accent-100 text-accent-700'
                    }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink/60">Firestore</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void handleDelete(a.id)}
                    className="inline-flex items-center gap-1 text-xs text-sienna hover:text-sienna/80"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {mdxOnly.map((fm) => (
              <tr key={fm.slug} className="bg-paper/50">
                <td className="px-4 py-3 font-medium text-ink/80">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-3 w-3 text-ink/40" />
                    {fm.title}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink/60">{fm.slug}</td>
                <td className="px-4 py-3 text-ink/70">en</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                    {fm.draft ? 'draft' : 'published'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink/60">MDX (repo)</td>
                <td className="px-4 py-3 text-right text-xs italic text-ink/50">
                  edit in git
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
