import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';

interface NotFoundCopy {
  eyebrow: string;
  title: string;
  body: string;
}

interface NotFoundPopularLink {
  to: string;
  labelEn: string;
  labelAr: string;
  hintEn: string;
  hintAr: string;
}

export default function NotFoundPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const notFound = useSiteSetting<NotFoundCopy>('notFound', locale);
  const copy = notFound.data?.value;
  const eyebrow = copy?.eyebrow || t('notFound.eyebrow');
  const titleText = copy?.title || t('notFound.title');
  const bodyText = copy?.body || t('notFound.description');
  const popularLinks =
    (notFound.data?.data?.popularLinks as NotFoundPopularLink[] | undefined) ?? [];

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    // We don't have on-site search yet; route searchers to the article index
    // with their query as a hint — the index page can pick it up later.
    const base = localizePath('/learn/articles');
    if (q) {
      navigate(`${base}?q=${encodeURIComponent(q)}`);
    } else {
      navigate(base);
    }
  };

  return (
    <>
      <SeoHead title={t('notFound.seoTitle')} description={t('notFound.seoDescription')} noindex />
      <Container className="py-20 text-center md:py-24">
        <p className="text-accent-500 font-serif text-sm uppercase tracking-widest">{eyebrow}</p>
        <h1 className="text-primary-700 dark:text-accent-300 mx-auto mt-4 max-w-2xl text-balance font-serif text-5xl font-semibold md:text-6xl">
          {titleText}
        </h1>
        <p className="text-ink/70 dark:text-paper/70 mx-auto mt-4 max-w-xl text-lg">{bodyText}</p>

        {/* Tasteful, subtle ASCII path illustration. */}
        <pre
          aria-hidden="true"
          dir="ltr"
          className="text-ink/30 dark:text-paper/30 mx-auto mt-10 select-none font-mono text-[0.7rem] leading-tight md:text-xs"
        >
          {`       .                      .
      / \\                    / \\
     /   \\      · · ·       /   \\
    /  ·  \\_________________/  ·  \\
   /                                 \\
  /   ─────── the straight path ───   \\`}
        </pre>

        {/* Search suggestion box. */}
        <form
          onSubmit={onSearch}
          className="border-ink/10 bg-paper/50 dark:border-paper/10 dark:bg-ink/30 mx-auto mt-10 flex w-full max-w-md flex-col gap-2 rounded-2xl border p-4 text-start shadow-sm sm:flex-row sm:items-center"
          role="search"
          aria-label={t('notFound.searchLabel')}
        >
          <label htmlFor="nf-search" className="sr-only">
            {t('notFound.searchLabel')}
          </label>
          <input
            id="nf-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('notFound.searchPlaceholder')}
            className="border-ink/10 bg-paper text-ink placeholder:text-ink/40 focus:border-primary-500 focus:ring-primary-500/40 dark:border-paper/10 dark:bg-ink/50 dark:text-paper dark:placeholder:text-paper/40 flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2"
          />
          <button type="submit" className="btn-primary sm:shrink-0">
            {t('notFound.searchButton')}
          </button>
        </form>

        {/* Popular links. */}
        <div className="mx-auto mt-12 max-w-3xl">
          <h2 className="text-primary-700 dark:text-accent-300 font-serif text-xl">
            {t('notFound.popularHeading')}
          </h2>
          <ul className="mt-6 grid gap-3 text-start sm:grid-cols-2 md:grid-cols-3">
            {popularLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={localizePath(link.to)}
                  className="border-ink/10 hover:border-primary-500/60 hover:bg-paper/60 focus:ring-primary-500/40 dark:border-paper/10 dark:hover:bg-ink/40 block h-full rounded-xl border p-4 transition focus:outline-none focus:ring-2"
                >
                  <span className="text-primary-700 dark:text-accent-300 block font-serif text-lg">
                    {locale === 'ar' ? link.labelAr : link.labelEn}
                  </span>
                  <span className="text-ink/60 dark:text-paper/60 mt-1 block text-sm">
                    {locale === 'ar' ? link.hintAr : link.hintEn}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to={localizePath('/')} className="btn-primary">
            {t('notFound.home')}
          </Link>
          <Link to={localizePath('/contact')} className="btn-ghost">
            {t('notFound.contactHint')}
          </Link>
        </div>
      </Container>
    </>
  );
}
