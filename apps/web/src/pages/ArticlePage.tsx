import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { getArticle } from '@/content/articles';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { canonicalFor } from '@/lib/routes';
import { articleSchema, breadcrumbSchema, graph } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

export default function ArticlePage() {
  const { t, i18n } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticle(slug) : undefined;
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';

  if (!article) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-serif text-3xl">{t('articlesPage.notFound')}</h1>
        <Link to={localizePath('/learn/articles')} className="btn-ghost mt-6">
          {t('articlesPage.backBtn')}
        </Link>
      </Container>
    );
  }

  const { frontmatter, Component } = article;

  // Use translated title/excerpt for display + metadata when available, falling
  // back to the MDX frontmatter for untranslated articles.
  const displayTitle = i18n.exists(`articles.${frontmatter.slug}.title`)
    ? (t(`articles.${frontmatter.slug}.title`) as string)
    : frontmatter.title;
  const displayExcerpt = i18n.exists(`articles.${frontmatter.slug}.excerpt`)
    ? (t(`articles.${frontmatter.slug}.excerpt`) as string)
    : frontmatter.excerpt;

  // The back-arrow points "backwards" in the reading direction: left in LTR,
  // right in RTL. Using two icons keeps the chevron semantically correct.
  const BackIcon = locale === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <>
      <SeoHead
        title={displayTitle}
        description={displayExcerpt}
        type="article"
        canonical={canonicalFor(`/learn/articles/${frontmatter.slug}`, locale)}
        alternatePath={`/learn/articles/${frontmatter.slug}`}
        ogImage={frontmatter.heroImage}
        jsonLd={graph(
          articleSchema({
            slug: frontmatter.slug,
            title: displayTitle,
            excerpt: displayExcerpt,
            publishedAt: frontmatter.publishedAt,
            author: frontmatter.author,
            heroImage: frontmatter.heroImage,
            tags: frontmatter.tags,
          }),
          breadcrumbSchema([
            { name: t('nav.home'), url: canonicalFor('/', locale) },
            { name: t('nav.learn'), url: canonicalFor('/learn', locale) },
            { name: t('nav.articles'), url: canonicalFor('/learn/articles', locale) },
            {
              name: displayTitle,
              url: canonicalFor(`/learn/articles/${frontmatter.slug}`, locale),
            },
          ]),
        )}
      />
      <article className="py-16">
        <Container>
          <Link
            to={localizePath('/learn/articles')}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-accent-400"
          >
            <BackIcon size={14} /> {t('articlesPage.backToArticles')}
          </Link>
          <header className="mt-8 border-b border-primary-500/10 pb-8 dark:border-primary-700/40">
            <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
              {formatDate(frontmatter.publishedAt, dateLocale)} · {frontmatter.author}
            </p>
            <h1 className="mt-3 text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
              {displayTitle}
            </h1>
            <p className="text-pretty mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
              {displayExcerpt}
            </p>
          </header>

          {/* Article bodies are authored in English only for now. When the
              reader has loaded the Arabic shell, flag the mismatch up-front
              and render the English body in an LTR island so typography
              stays natural. */}
          {locale === 'ar' ? (
            <div
              className="mx-auto mt-8 max-w-prose rounded-xl border border-accent-300/50 bg-accent-50/60 p-4 text-sm text-primary-700 dark:border-accent-500/30 dark:bg-primary-800/60 dark:text-accent-200"
              role="note"
            >
              {t('articlesPage.arabicComingSoon')}
            </div>
          ) : null}
          <div
            className="prose prose-lg mx-auto mt-12 dark:prose-invert"
            lang={locale === 'ar' ? 'en' : undefined}
            dir={locale === 'ar' ? 'ltr' : undefined}
          >
            <Component />
          </div>
        </Container>
      </article>
    </>
  );
}
