import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import type { PublicArticle } from '@/lib/content';

/**
 * A prominent 3-step "Start here" row rendered near the top of the Learn page.
 *
 * The caller decides which articles to feed in (so we don't hard-code slugs
 * in a component file) — we just lay them out as a numbered, progressive
 * reading order. Missing articles are skipped gracefully so the row keeps
 * working while some picks are still drafts.
 *
 * `eyebrow`, `title` and `description` are pass-through so they can come
 * from either locale files (legacy) or a Firestore `siteSettings.startHere`
 * document (current).
 */
export interface StartHereStepsProps {
  articles: PublicArticle[];
  eyebrow?: string;
  title?: string;
  description?: string;
}

export default function StartHereSteps({
  articles,
  eyebrow,
  title,
  description,
}: StartHereStepsProps) {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();

  if (articles.length === 0) return null;

  const eyebrowText = eyebrow ?? (t('learn.startHere.eyebrow') as string);
  const titleText = title ?? (t('learn.startHere.title') as string);
  const descriptionText = description ?? (t('learn.startHere.description') as string);

  return (
    <section
      aria-labelledby="start-here-heading"
      className="border-primary-500/10 from-primary-50 to-accent-50 dark:border-primary-700/40 dark:from-primary-800 dark:via-primary-900 dark:to-primary-800 relative overflow-hidden rounded-3xl border bg-gradient-to-br via-white p-6 shadow-sm md:p-10"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-accent-500 font-serif text-sm uppercase tracking-widest">
            {eyebrowText}
          </p>
          <h2
            id="start-here-heading"
            className="text-primary-700 dark:text-accent-300 mt-2 font-serif text-3xl font-semibold md:text-4xl"
          >
            {titleText}
          </h2>
          <p className="text-ink/70 dark:text-paper/70 mt-2 max-w-xl">{descriptionText}</p>
        </div>
      </div>

      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {articles.map((a, i) => {
          const stepNumber = String(i + 1).padStart(2, '0');
          return (
            <li key={a.slug} className="contents">
              <Link
                to={localizePath(`/learn/articles/${a.slug}`)}
                className="border-primary-500/10 focus-visible:outline-accent-400 dark:border-primary-700/40 dark:bg-primary-800 group relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span
                  aria-hidden="true"
                  className="text-primary-300 group-hover:text-accent-400 dark:text-primary-600 font-serif text-5xl font-semibold leading-none transition-colors"
                >
                  {stepNumber}
                </span>
                <h3 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 mt-4 font-serif text-xl font-semibold">
                  {a.title}
                </h3>
                <span className="text-primary-600 dark:text-accent-400 mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold">
                  {t('learn.startHere.step', { n: i + 1 })}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
