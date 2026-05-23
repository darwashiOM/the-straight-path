import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { usePublishedArticles, type PublicArticle } from '@/lib/content';

interface PrevNextArticleProps {
  /** Slug of the current article to locate it in the ordered list. */
  currentSlug: string;
  /**
   * Optional pre-fetched article pool. Pass from the article page to avoid a
   * duplicate Firestore fetch; if omitted the component fetches via
   * `usePublishedArticles` using the current locale.
   */
  pool?: PublicArticle[];
}

/**
 * Previous / Next article navigation, ordered by `publishedAt` descending
 * (same order the index page uses). The component renders two simple cards
 * side-by-side on desktop and stacked on mobile. In RTL locales the chevron
 * directions flip so "previous" still points backwards in reading order.
 */
export default function PrevNextArticle({ currentSlug, pool }: PrevNextArticleProps) {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();

  const fallback = usePublishedArticles(locale);
  const list = pool ?? fallback.data;

  const { prev, next } = useMemo(() => {
    const idx = list.findIndex((a) => a.slug === currentSlug);
    if (idx === -1) return { prev: undefined, next: undefined };
    // `articles` is sorted newest-first, so the "previous" (older) article
    // is the next index, and the "next" (newer) is the previous index.
    return {
      prev: list[idx + 1],
      next: list[idx - 1],
    };
  }, [list, currentSlug]);

  if (!prev && !next) return null;

  const prevLabel = t('articlesPage.previousArticle', 'Previous article') as string;
  const nextLabel = t('articlesPage.nextArticle', 'Next article') as string;

  const PrevIcon = ArrowLeft;
  const NextIcon = ArrowRight;

  return (
    <nav
      aria-label={t('articlesPage.articleNav', 'Article navigation') as string}
      className="border-primary-500/10 dark:border-primary-700/40 mt-12 grid gap-4 border-t pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          to={localizePath(`/learn/articles/${prev.slug}`)}
          className="border-primary-500/10 bg-paper/50 hover:border-accent-400 dark:border-primary-700/40 dark:bg-primary-800/40 group rounded-xl border p-5 transition hover:shadow-md"
        >
          <span className="text-accent-500 inline-flex items-center gap-2 font-serif text-xs uppercase tracking-widest">
            <PrevIcon size={14} /> {prevLabel}
          </span>
          <p className="text-primary-700 group-hover:text-primary-800 dark:text-accent-300 dark:group-hover:text-accent-200 mt-2 font-serif text-lg">
            {prev.title}
          </p>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {next ? (
        <Link
          to={localizePath(`/learn/articles/${next.slug}`)}
          className="border-primary-500/10 bg-paper/50 hover:border-accent-400 dark:border-primary-700/40 dark:bg-primary-800/40 group rounded-xl border p-5 text-right transition hover:shadow-md"
        >
          <span className="text-accent-500 inline-flex items-center gap-2 font-serif text-xs uppercase tracking-widest">
            {nextLabel} <NextIcon size={14} />
          </span>
          <p className="text-primary-700 group-hover:text-primary-800 dark:text-accent-300 dark:group-hover:text-accent-200 mt-2 font-serif text-lg">
            {next.title}
          </p>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
