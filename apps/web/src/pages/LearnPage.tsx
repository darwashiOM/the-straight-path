import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { getPublishedArticles } from '@/content/articles';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

export default function LearnPage() {
  const { t, i18n } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const articles = getPublishedArticles();
  const meta = getRouteMeta('/learn')!;

  const translateArticleTitle = (slug: string, fallback: string) =>
    i18n.exists(`articles.${slug}.title`) ? (t(`articles.${slug}.title`) as string) : fallback;
  const translateArticleExcerpt = (slug: string, fallback: string) =>
    i18n.exists(`articles.${slug}.excerpt`)
      ? (t(`articles.${slug}.excerpt`) as string)
      : fallback;

  return (
    <>
      <SeoHead
        title={t('learn.title')}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/learn', locale)}
        alternatePath="/learn"
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.learn'), url: canonicalFor('/learn', locale) },
        ])}
      />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          {t('learn.title')}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          {t('learn.description')}
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.frontmatter.slug}
              to={localizePath(`/learn/articles/${a.frontmatter.slug}`)}
              className="card group p-6"
            >
              <h2 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                {translateArticleTitle(a.frontmatter.slug, a.frontmatter.title)}
              </h2>
              <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">
                {translateArticleExcerpt(a.frontmatter.slug, a.frontmatter.excerpt)}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
