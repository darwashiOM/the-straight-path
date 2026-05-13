import { useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ArticleCover from '@/components/ArticleCover';
import ArticleToc from '@/components/ArticleToc';
import Container from '@/components/Container';
import Image from '@/components/Image';
import PrevNextArticle from '@/components/PrevNextArticle';
import ReadingProgress from '@/components/ReadingProgress';
import RelatedArticles from '@/components/RelatedArticles';
import SeoHead from '@/components/SeoHead';
import ShareButtons from '@/components/ShareButtons';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useArticle, usePublishedArticles } from '@/lib/content';
import { canonicalFor } from '@/lib/routes';
import { articleSchema, breadcrumbSchema, graph } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

export default function ArticlePage() {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useArticle(slug, locale);
  const { data: publishedArticles } = usePublishedArticles(locale);
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';

  // Refs for progress bar (article scroll target) and TOC (body heading scan).
  const articleRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Loading skeleton — shown only while the initial fetch is in flight and we
  // have nothing to render. On a warm cache (data already resolved) we fall
  // straight through to the real article.
  if (isLoading && !article) {
    return (
      <Container className="py-16">
        <Skeleton height="0.75rem" width={160} className="mb-6" />
        <Skeleton height="3.5rem" width="80%" />
        <Skeleton variant="text-line" lines={3} className="mt-6 max-w-2xl" />
        <Skeleton className="mt-8 aspect-[16/9] w-full" />
        <Skeleton variant="text-line" lines={8} className="mt-10 max-w-prose" />
      </Container>
    );
  }

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

  const { slug: articleSlug, title, excerpt, body, publishedAt, author, tags, heroImage } = article;

  // The back-arrow points "backwards" in the reading direction: left in LTR,
  // right in RTL. Using two icons keeps the chevron semantically correct.
  const BackIcon = locale === 'ar' ? ArrowRight : ArrowLeft;
  const CrumbIcon = ChevronRight; // Visual direction handled by rtl text flow.

  const canonicalUrl = canonicalFor(`/learn/articles/${articleSlug}`, locale);

  return (
    <>
      <SeoHead
        title={title}
        description={excerpt}
        type="article"
        canonical={canonicalUrl}
        alternatePath={`/learn/articles/${articleSlug}`}
        ogImage={heroImage}
        jsonLd={graph(
          articleSchema({
            slug: articleSlug,
            title,
            excerpt,
            publishedAt,
            author,
            heroImage,
            tags,
          }),
          breadcrumbSchema([
            { name: t('nav.home'), url: canonicalFor('/', locale) },
            { name: t('nav.learn'), url: canonicalFor('/learn', locale) },
            { name: t('nav.articles'), url: canonicalFor('/learn/articles', locale) },
            {
              name: title,
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
            className="text-ink/60 dark:text-paper/60 text-sm"
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
                className="text-primary-700 dark:text-accent-300 max-w-[18rem] truncate"
              >
                {title}
              </li>
            </ol>
          </nav>

          <Link
            to={localizePath('/learn/articles')}
            className="text-primary-600 hover:text-primary-700 dark:text-accent-400 mt-6 inline-flex items-center gap-2 text-sm"
          >
            <BackIcon size={14} /> {t('articlesPage.backToArticles')}
          </Link>

          <header className="border-primary-500/10 dark:border-primary-700/40 mt-8 border-b pb-8">
            <p className="text-accent-500 font-serif text-sm uppercase tracking-widest">
              {formatDate(publishedAt, dateLocale)} · {author}
            </p>
            <h1 className="text-primary-700 dark:text-accent-300 mt-3 text-balance font-serif text-5xl font-semibold md:text-6xl">
              {title}
            </h1>
            <p className="text-ink/70 dark:text-paper/70 mt-4 max-w-prose text-pretty text-lg">
              {excerpt}
            </p>
          </header>

          {/* Hero image slot: render the frontmatter image full-width when
              provided, otherwise fall back to the deterministic gradient
              ArticleCover so every article has a visual anchor. */}
          <div className="mt-8">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={title}
                aspectRatio="16 / 9"
                priority
                pictureClassName="block w-full overflow-hidden rounded-xl"
                className="h-full w-full object-cover"
              />
            ) : (
              <ArticleCover slug={articleSlug} label={tags?.[0]} className="rounded-xl" />
            )}
          </div>

          {/* Arabic UX note for English-only bodies. */}
          {locale === 'ar' ? (
            <div
              className="border-accent-300/50 bg-accent-50/60 text-primary-700 dark:border-accent-500/30 dark:bg-primary-800/60 dark:text-accent-200 mx-auto mt-8 max-w-prose rounded-xl border p-4 text-sm"
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
                className="prose prose-lg dark:prose-invert prose-p:leading-[1.8] prose-blockquote:border-l-4 prose-blockquote:border-accent-400 prose-blockquote:bg-accent-50/40 dark:prose-blockquote:bg-primary-800/40 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:rounded-r-lg first-of-type:prose-p:first-letter:float-left first-of-type:prose-p:first-letter:mr-2 first-of-type:prose-p:first-letter:font-serif first-of-type:prose-p:first-letter:text-6xl first-of-type:prose-p:first-letter:leading-[0.9] first-of-type:prose-p:first-letter:text-accent-500 mx-auto"
                lang={locale === 'ar' ? 'en' : undefined}
                dir={locale === 'ar' ? 'ltr' : undefined}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              </div>

              <div className="mx-auto max-w-prose">
                <ShareButtons url={canonicalUrl} title={title} description={excerpt} />

                <RelatedArticles currentSlug={articleSlug} tags={tags} pool={publishedArticles} />

                <PrevNextArticle currentSlug={articleSlug} pool={publishedArticles} />
              </div>
            </div>

            <ArticleToc bodyRef={bodyRef} scrollOffset={96} />
          </div>
        </Container>
      </article>
    </>
  );
}
