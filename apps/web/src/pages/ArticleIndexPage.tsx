import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { articles } from '@/content/articles';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

export default function ArticleIndexPage() {
  const { t, i18n } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const meta = getRouteMeta('/learn/articles')!;
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';

  const translateArticleTitle = (slug: string, fallback: string) =>
    i18n.exists(`articles.${slug}.title`) ? (t(`articles.${slug}.title`) as string) : fallback;
  const translateArticleExcerpt = (slug: string, fallback: string) =>
    i18n.exists(`articles.${slug}.excerpt`)
      ? (t(`articles.${slug}.excerpt`) as string)
      : fallback;

  return (
    <>
      <SeoHead
        title={t('articlesPage.title')}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/learn/articles', locale)}
        alternatePath="/learn/articles"
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.learn'), url: canonicalFor('/learn', locale) },
          { name: t('nav.articles'), url: canonicalFor('/learn/articles', locale) },
        ])}
      />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          {t('articlesPage.title')}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          {t('articlesPage.description')}
        </p>
        <ul className="mt-12 divide-y divide-primary-500/10 dark:divide-primary-700/40">
          {articles.map((a) => (
            <li key={a.frontmatter.slug} className="py-6">
              <Link
                to={localizePath(`/learn/articles/${a.frontmatter.slug}`)}
                className="group block"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-2xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                    {translateArticleTitle(a.frontmatter.slug, a.frontmatter.title)}
                    {a.frontmatter.draft ? (
                      <span className="ms-3 rounded bg-accent-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent-700">
                        {t('articlesPage.draft')}
                      </span>
                    ) : null}
                  </h2>
                  <span className="shrink-0 text-sm text-ink/50 dark:text-paper/60">
                    {formatDate(a.frontmatter.publishedAt, dateLocale)}
                  </span>
                </div>
                <p className="mt-2 text-ink/70 dark:text-paper/70">
                  {translateArticleExcerpt(a.frontmatter.slug, a.frontmatter.excerpt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
