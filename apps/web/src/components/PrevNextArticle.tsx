import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { getPublishedArticles, type ArticleModule } from '@/content/articles';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

interface PrevNextArticleProps {
  /** Slug of the current article to locate it in the ordered list. */
  currentSlug: string;
}

/**
 * Previous / Next article navigation, ordered by `publishedAt` descending
 * (same order the index page uses). The component renders two simple cards
 * side-by-side on desktop and stacked on mobile. In RTL locales the chevron
 * directions flip so "previous" still points backwards in reading order.
 */
export default function PrevNextArticle({ currentSlug }: PrevNextArticleProps) {
  const { t, i18n } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();

  const { prev, next } = useMemo(() => {
    const list = getPublishedArticles();
    const idx = list.findIndex((a) => a.frontmatter.slug === currentSlug);
    if (idx === -1) return { prev: undefined, next: undefined };
    // `articles` is sorted newest-first, so the "previous" (older) article
    // is the next index, and the "next" (newer) is the previous index.
    return {
      prev: list[idx + 1],
      next: list[idx - 1],
    };
  }, [currentSlug]);

  if (!prev && !next) return null;

  const prevLabel = t('articlesPage.previousArticle', 'Previous article') as string;
  const nextLabel = t('articlesPage.nextArticle', 'Next article') as string;

  const PrevIcon = locale === 'ar' ? ArrowRight : ArrowLeft;
  const NextIcon = locale === 'ar' ? ArrowLeft : ArrowRight;

  const titleFor = (a: ArticleModule) =>
    i18n.exists(`articles.${a.frontmatter.slug}.title`)
      ? (t(`articles.${a.frontmatter.slug}.title`) as string)
      : a.frontmatter.title;

  return (
    <nav
      aria-label={t('articlesPage.articleNav', 'Article navigation') as string}
      className="mt-12 grid gap-4 border-t border-primary-500/10 pt-8 sm:grid-cols-2 dark:border-primary-700/40"
    >
      {prev ? (
        <Link
          to={localizePath(`/learn/articles/${prev.frontmatter.slug}`)}
          className="group rounded-xl border border-primary-500/10 bg-paper/50 p-5 transition hover:border-accent-400 hover:shadow-md dark:border-primary-700/40 dark:bg-primary-800/40"
        >
          <span className="inline-flex items-center gap-2 font-serif text-xs uppercase tracking-widest text-accent-500">
            <PrevIcon size={14} /> {prevLabel}
          </span>
          <p className="mt-2 font-serif text-lg text-primary-700 group-hover:text-primary-800 dark:text-accent-300 dark:group-hover:text-accent-200">
            {titleFor(prev)}
          </p>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {next ? (
        <Link
          to={localizePath(`/learn/articles/${next.frontmatter.slug}`)}
          className="group rounded-xl border border-primary-500/10 bg-paper/50 p-5 text-right transition hover:border-accent-400 hover:shadow-md dark:border-primary-700/40 dark:bg-primary-800/40"
        >
          <span className="inline-flex items-center gap-2 font-serif text-xs uppercase tracking-widest text-accent-500">
            {nextLabel} <NextIcon size={14} />
          </span>
          <p className="mt-2 font-serif text-lg text-primary-700 group-hover:text-primary-800 dark:text-accent-300 dark:group-hover:text-accent-200">
            {titleFor(next)}
          </p>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
