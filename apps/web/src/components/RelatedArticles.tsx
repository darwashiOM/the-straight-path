import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { getPublishedArticles, type ArticleModule } from '@/content/articles';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { formatDate } from '@/lib/utils';

interface RelatedArticlesProps {
  /** Slug of the current article so it's excluded from the list. */
  currentSlug: string;
  /** Tags of the current article used to score candidates. */
  tags?: string[];
  /** Maximum number of related cards to display. */
  limit?: number;
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
}: RelatedArticlesProps) {
  const { t, i18n } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';

  const related = useMemo(() => {
    const tagSet = new Set(tags);
    const candidates = getPublishedArticles().filter(
      (a) => a.frontmatter.slug !== currentSlug,
    );

    const scored = candidates.map((a) => {
      const overlap = (a.frontmatter.tags ?? []).reduce(
        (acc, tag) => acc + (tagSet.has(tag) ? 1 : 0),
        0,
      );
      return { article: a, score: overlap };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (
        new Date(b.article.frontmatter.publishedAt).getTime() -
        new Date(a.article.frontmatter.publishedAt).getTime()
      );
    });

    return scored.slice(0, limit).map((s) => s.article);
  }, [currentSlug, tags, limit]);

  if (related.length === 0) return null;

  const heading = t('articlesPage.related', 'Related reading') as string;

  const titleFor = (a: ArticleModule) =>
    i18n.exists(`articles.${a.frontmatter.slug}.title`)
      ? (t(`articles.${a.frontmatter.slug}.title`) as string)
      : a.frontmatter.title;

  const excerptFor = (a: ArticleModule) =>
    i18n.exists(`articles.${a.frontmatter.slug}.excerpt`)
      ? (t(`articles.${a.frontmatter.slug}.excerpt`) as string)
      : a.frontmatter.excerpt;

  return (
    <section className="mt-16" aria-labelledby="related-articles-heading">
      <h2
        id="related-articles-heading"
        className="font-serif text-2xl text-primary-700 dark:text-accent-300"
      >
        {heading}
      </h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2">
        {related.map((a) => (
          <li key={a.frontmatter.slug}>
            <Link
              to={localizePath(`/learn/articles/${a.frontmatter.slug}`)}
              className="group block h-full rounded-xl border border-primary-500/10 bg-paper/50 p-5 transition hover:border-accent-400 hover:shadow-md dark:border-primary-700/40 dark:bg-primary-800/40"
            >
              <p className="font-serif text-xs uppercase tracking-widest text-accent-500">
                {formatDate(a.frontmatter.publishedAt, dateLocale)}
              </p>
              <h3 className="mt-2 font-serif text-lg text-primary-700 group-hover:text-primary-800 dark:text-accent-300 dark:group-hover:text-accent-200">
                {titleFor(a)}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm text-ink/70 dark:text-paper/70">
                {excerptFor(a)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
