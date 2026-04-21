import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen } from 'lucide-react';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import type { PublicArticle, PublicSeries } from '@/lib/content';
import { readingTimeMinutes } from '@/lib/reading-time';

/**
 * Renders a horizontal "series" card — a named reading order with a stacked
 * preview of the articles it contains. Clicking the headline CTA sends the
 * reader to the first article in the series.
 */
export interface SeriesCardProps {
  series: PublicSeries;
  articles: PublicArticle[];
}

export default function SeriesCard({ series, articles }: SeriesCardProps) {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const arrowIconClass = locale === 'ar' ? 'rotate-180' : undefined;

  const first = articles[0];
  if (!first) return null;

  return (
    <section className="card overflow-hidden md:grid md:grid-cols-5">
      {/* Left column — series identity & CTA. */}
      <div className="col-span-2 flex flex-col justify-between gap-6 bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-paper dark:from-primary-700 dark:to-primary-900">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-200">
            <BookOpen size={14} aria-hidden="true" />
            {t('learn.series.eyebrow')}
          </p>
          <h3 className="mt-3 font-serif text-2xl font-semibold md:text-3xl">{series.title}</h3>
          <p className="mt-3 text-sm text-paper/80">{series.description}</p>
        </div>
        <Link
          to={localizePath(`/learn/articles/${first.slug}`)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-accent-400 px-4 py-2 text-sm font-semibold text-primary-900 transition-colors hover:bg-accent-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
        >
          {t('learn.series.start')}
          <ArrowRight size={14} aria-hidden="true" className={arrowIconClass} />
        </Link>
      </div>

      {/* Right column — the stacked article list. */}
      <ol className="col-span-3 divide-y divide-primary-500/10 p-2 dark:divide-primary-700/40">
        {articles.map((a, i) => (
          <li key={a.slug}>
            <Link
              to={localizePath(`/learn/articles/${a.slug}`)}
              className="group flex items-center gap-4 rounded-xl p-4 transition-colors hover:bg-primary-50 dark:hover:bg-primary-700/40"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 font-serif text-sm font-semibold text-primary-700 dark:bg-primary-700 dark:text-accent-300"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                  {a.title}
                </p>
                <p className="truncate text-xs text-ink/60 dark:text-paper/60">
                  {t('learn.readingTime', { minutes: readingTimeMinutes(a.body) })}
                </p>
              </div>
              <ArrowRight
                size={16}
                aria-hidden="true"
                className={`shrink-0 text-primary-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-accent-400 ${arrowIconClass ?? ''}`}
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
