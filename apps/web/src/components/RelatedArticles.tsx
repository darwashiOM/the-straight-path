import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { usePublishedArticles, type PublicArticle } from '@/lib/content';
import { formatDate } from '@/lib/utils';

interface RelatedArticlesProps {
  /** Slug of the current article so it's excluded from the list. */
  currentSlug: string;
  /** Tags of the current article used to score candidates. */
  tags?: string[];
  /** Maximum number of related cards to display. */
  limit?: number;
  /**
   * Optional pre-fetched article pool. Pass from the article page to avoid a
   * duplicate Firestore fetch; if omitted the component fetches via
   * `usePublishedArticles` using the current locale.
   */
  pool?: PublicArticle[];
}

/**
 * Renders up to `limit` published articles that are related to the current
 * one. Relatedness is scored by the number of overlapping tags, falling
 * back to recency when scores tie (and filling in with recent articles if
 * nothing shares tags).
 */
export default function RelatedArticles({
  currentSlug,
  tags = [],
  limit = 3,
  pool,
}: RelatedArticlesProps) {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';

  const fallback = usePublishedArticles(locale);
  const articles = pool ?? fallback.data;

  const related = useMemo(() => {
    const tagSet = new Set(tags);
    const candidates = articles.filter((a) => a.slug !== currentSlug);

    const scored = candidates.map((a) => {
      const overlap = (a.tags ?? []).reduce((acc, tag) => acc + (tagSet.has(tag) ? 1 : 0), 0);
      return { article: a, score: overlap };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime();
    });

    return scored.slice(0, limit).map((s) => s.article);
  }, [articles, currentSlug, tags, limit]);

  if (related.length === 0) return null;

  const heading = t('articlesPage.related', 'Related reading') as string;

  return (
    <section className="mt-16" aria-labelledby="related-articles-heading">
      <h2
        id="related-articles-heading"
        className="text-primary-700 dark:text-accent-300 font-serif text-2xl"
      >
        {heading}
      </h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2">
        {related.map((a) => (
          <li key={a.slug}>
            <Link
              to={localizePath(`/learn/articles/${a.slug}`)}
              className="border-primary-500/10 bg-paper/50 hover:border-accent-400 dark:border-primary-700/40 dark:bg-primary-800/40 group block h-full rounded-xl border p-5 transition hover:shadow-md"
            >
              <p className="text-accent-500 font-serif text-xs uppercase tracking-widest">
                {formatDate(a.publishedAt, dateLocale)}
              </p>
              <h3 className="text-primary-700 group-hover:text-primary-800 dark:text-accent-300 dark:group-hover:text-accent-200 mt-2 font-serif text-lg">
                {a.title}
              </h3>
              <p className="text-ink/70 dark:text-paper/70 mt-2 line-clamp-3 text-sm">
                {a.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
