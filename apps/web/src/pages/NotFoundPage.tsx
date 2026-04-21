import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

type LinkKey = 'learn' | 'articles' | 'faq' | 'quran' | 'about' | 'contact';

const POPULAR_LINKS: Array<{ to: string; key: LinkKey }> = [
  { to: '/learn', key: 'learn' },
  { to: '/learn/articles', key: 'articles' },
  { to: '/faq', key: 'faq' },
  { to: '/quran', key: 'quran' },
  { to: '/about', key: 'about' },
  { to: '/contact', key: 'contact' },
];

export default function NotFoundPage() {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

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
        <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
          {t('notFound.eyebrow')}
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
          {t('notFound.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink/70 dark:text-paper/70">
          {t('notFound.description')}
        </p>

        {/* Tasteful, subtle ASCII path illustration. */}
        <pre
          aria-hidden="true"
          dir="ltr"
          className="mx-auto mt-10 select-none font-mono text-[0.7rem] leading-tight text-ink/30 dark:text-paper/30 md:text-xs"
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
          className="mx-auto mt-10 flex w-full max-w-md flex-col gap-2 rounded-2xl border border-ink/10 bg-paper/50 p-4 text-start shadow-sm dark:border-paper/10 dark:bg-ink/30 sm:flex-row sm:items-center"
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
            className="flex-1 rounded-lg border border-ink/10 bg-paper px-3 py-2 text-ink placeholder:text-ink/40 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-paper/10 dark:bg-ink/50 dark:text-paper dark:placeholder:text-paper/40"
          />
          <button type="submit" className="btn-primary sm:shrink-0">
            {t('notFound.searchButton')}
          </button>
        </form>

        {/* Popular links. */}
        <div className="mx-auto mt-12 max-w-3xl">
          <h2 className="font-serif text-xl text-primary-700 dark:text-accent-300">
            {t('notFound.popularHeading')}
          </h2>
          <ul className="mt-6 grid gap-3 text-start sm:grid-cols-2 md:grid-cols-3">
            {POPULAR_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={localizePath(link.to)}
                  className="block h-full rounded-xl border border-ink/10 p-4 transition hover:border-primary-500/60 hover:bg-paper/60 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-paper/10 dark:hover:bg-ink/40"
                >
                  <span className="block font-serif text-lg text-primary-700 dark:text-accent-300">
                    {t(`notFound.links.${link.key}.label`)}
                  </span>
                  <span className="mt-1 block text-sm text-ink/60 dark:text-paper/60">
                    {t(`notFound.links.${link.key}.hint`)}
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
