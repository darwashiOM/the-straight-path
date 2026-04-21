import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';

import ArticleCover from '@/components/ArticleCover';
import ArticleToc from '@/components/ArticleToc';
import Container from '@/components/Container';
import Image from '@/components/Image';
import PrevNextArticle from '@/components/PrevNextArticle';
import ReadingProgress from '@/components/ReadingProgress';
import RelatedArticles from '@/components/RelatedArticles';
import SeoHead from '@/components/SeoHead';
import ShareButtons from '@/components/ShareButtons';
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

  // Refs for progress bar (article scroll target) and TOC (body heading scan).
  const articleRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

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
  const CrumbIcon = locale === 'ar' ? ChevronRight : ChevronRight; // Same icon; visual direction handled by rtl text flow.

  const canonicalUrl = canonicalFor(`/learn/articles/${frontmatter.slug}`, locale);

  return (
    <>
      <SeoHead
        title={displayTitle}
        description={displayExcerpt}
        type="article"
        canonical={canonicalUrl}
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
              url: canonicalUrl,
            },
          ]),
        )}
      />
      {/* Thin progress bar rides below the sticky navbar (h-16 ≈ 64px). */}
      <ReadingProgress target={articleRef} topOffset={64} />

      <article ref={articleRef} className="py-12">
        <Container>
          {/* Breadcrumb trail — inlined rather than pulled into a shared
              component (polish agent owns that refactor). Home / Learn /
              Articles / <title>. */}
          <nav
            aria-label={t('nav.breadcrumbs', 'Breadcrumb') as string}
            className="text-sm text-ink/60 dark:text-paper/60"
          >
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link
                  to={localizePath('/')}
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                >
                  {t('nav.home')}
                </Link>
              </li>
              <li aria-hidden="true">
                <CrumbIcon size={14} className="opacity-50 rtl:rotate-180" />
              </li>
              <li>
                <Link
                  to={localizePath('/learn')}
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                >
                  {t('nav.learn')}
                </Link>
              </li>
              <li aria-hidden="true">
                <CrumbIcon size={14} className="opacity-50 rtl:rotate-180" />
              </li>
              <li>
                <Link
                  to={localizePath('/learn/articles')}
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                >
                  {t('nav.articles')}
                </Link>
              </li>
              <li aria-hidden="true">
                <CrumbIcon size={14} className="opacity-50 rtl:rotate-180" />
              </li>
              <li
                aria-current="page"
                className="max-w-[18rem] truncate text-primary-700 dark:text-accent-300"
              >
                {displayTitle}
              </li>
            </ol>
          </nav>

          <Link
            to={localizePath('/learn/articles')}
            className="mt-6 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-accent-400"
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

          {/* Hero image slot: render the frontmatter image full-width when
              provided, otherwise fall back to the deterministic gradient
              ArticleCover so every article has a visual anchor. */}
          <div className="mt-8">
            {frontmatter.heroImage ? (
              <Image
                src={frontmatter.heroImage}
                alt={displayTitle}
                aspectRatio="16 / 9"
                priority
                pictureClassName="block w-full overflow-hidden rounded-xl"
                className="h-full w-full object-cover"
              />
            ) : (
              <ArticleCover
                slug={frontmatter.slug}
                label={frontmatter.tags?.[0]}
                className="rounded-xl"
              />
            )}
          </div>

          {/* Arabic UX note for English-only bodies. */}
          {locale === 'ar' ? (
            <div
              className="mx-auto mt-8 max-w-prose rounded-xl border border-accent-300/50 bg-accent-50/60 p-4 text-sm text-primary-700 dark:border-accent-500/30 dark:bg-primary-800/60 dark:text-accent-200"
              role="note"
            >
              {t('articlesPage.arabicComingSoon')}
            </div>
          ) : null}

          {/* Two-column layout on lg+: article body + sticky TOC. On smaller
              screens the TOC is hidden and the body takes the full column. */}
          <div className="mt-12 lg:flex lg:items-start lg:gap-12">
            <div className="min-w-0 flex-1">
              <div
                ref={bodyRef}
                className="prose prose-lg mx-auto dark:prose-invert prose-p:leading-[1.8] prose-blockquote:border-l-4 prose-blockquote:border-accent-400 prose-blockquote:bg-accent-50/40 dark:prose-blockquote:bg-primary-800/40 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:rounded-r-lg first-of-type:prose-p:first-letter:float-left first-of-type:prose-p:first-letter:mr-2 first-of-type:prose-p:first-letter:font-serif first-of-type:prose-p:first-letter:text-6xl first-of-type:prose-p:first-letter:leading-[0.9] first-of-type:prose-p:first-letter:text-accent-500"
                lang={locale === 'ar' ? 'en' : undefined}
                dir={locale === 'ar' ? 'ltr' : undefined}
              >
                <Component />
              </div>

              <div className="mx-auto max-w-prose">
                <ShareButtons
                  url={canonicalUrl}
                  title={displayTitle}
                  description={displayExcerpt}
                />

                <RelatedArticles
                  currentSlug={frontmatter.slug}
                  tags={frontmatter.tags}
                />

                <PrevNextArticle currentSlug={frontmatter.slug} />
              </div>
            </div>

            <ArticleToc bodyRef={bodyRef} scrollOffset={96} />
          </div>
        </Container>
      </article>
    </>
  );
}
