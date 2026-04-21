import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import type { ArticleModule } from '@/content/articles';

/**
 * A prominent 3-step "Start here" row rendered near the top of the Learn page.
 *
 * The caller decides which articles to feed in (so we don't hard-code slugs
 * in a component file) — we just lay them out as a numbered, progressive
 * reading order. Missing articles are skipped gracefully so the row keeps
 * working while some picks are still drafts.
 */
export interface StartHereStepsProps {
  articles: ArticleModule[];
}

export default function StartHereSteps({ articles }: StartHereStepsProps) {
  const { t, i18n } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const arrowIconClass = locale === 'ar' ? 'rotate-180' : undefined;

  if (articles.length === 0) return null;

  const translateTitle = (slug: string, fallback: string) =>
    i18n.exists(`articles.${slug}.title`) ? (t(`articles.${slug}.title`) as string) : fallback;

  return (
    <section
      aria-labelledby="start-here-heading"
      className="relative overflow-hidden rounded-3xl border border-primary-500/10 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-6 shadow-sm dark:border-primary-700/40 dark:from-primary-800 dark:via-primary-900 dark:to-primary-800 md:p-10"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
            {t('learn.startHere.eyebrow')}
          </p>
          <h2
            id="start-here-heading"
            className="mt-2 font-serif text-3xl font-semibold text-primary-700 dark:text-accent-300 md:text-4xl"
          >
            {t('learn.startHere.title')}
          </h2>
          <p className="mt-2 max-w-xl text-ink/70 dark:text-paper/70">
            {t('learn.startHere.description')}
          </p>
        </div>
      </div>

      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {articles.map((a, i) => {
          const stepNumber = String(i + 1).padStart(2, '0');
          return (
            <li key={a.frontmatter.slug} className="contents">
              <Link
                to={localizePath(`/learn/articles/${a.frontmatter.slug}`)}
                className="group relative flex h-full flex-col rounded-2xl border border-primary-500/10 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 dark:border-primary-700/40 dark:bg-primary-800"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-5xl font-semibold leading-none text-primary-300 transition-colors group-hover:text-accent-400 dark:text-primary-600"
                >
                  {stepNumber}
                </span>
                <h3 className="mt-4 font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                  {translateTitle(a.frontmatter.slug, a.frontmatter.title)}
                </h3>
                <span className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-accent-400">
                  {t('learn.startHere.step', { n: i + 1 })}
                  <ArrowRight size={14} className={arrowIconClass} aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
