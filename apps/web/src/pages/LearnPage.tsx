import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import ArticleCover from '@/components/ArticleCover';
import SeriesCard from '@/components/SeriesCard';
import Skeleton from '@/components/Skeleton';
import StartHereSteps from '@/components/StartHereSteps';
import TopicChips, { TOPICS, type TopicSlug } from '@/components/TopicChips';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import {
  useArticles,
  useFaqs,
  useResources,
  useSeries,
  useSiteSetting,
  type PublicArticle,
} from '@/lib/content';
import { readingTimeMinutes } from '@/lib/reading-time';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

interface LearnHeaderCopy {
  title: string;
  description: string;
}

interface StartHereCopy {
  eyebrow: string;
  title: string;
  body?: string;
}

export default function LearnPage() {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const [searchParams, setSearchParams] = useSearchParams();
  const meta = getRouteMeta('/learn')!;
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';
  const arrow = locale === 'ar' ? '←' : '→';
  const arrowIconClass = locale === 'ar' ? 'rotate-180' : undefined;

  // --- Draft visibility ------------------------------------------------------
  // Drafts are hidden by default. Anyone can flip them on with ?showDrafts=1
  // for a shareable preview link; an admin-signed-in signal would live
  // alongside this later. We keep it URL-driven so bookmarks / links behave.
  const showDrafts = searchParams.get('showDrafts') === '1';

  // --- Topic filter ----------------------------------------------------------
  const rawTopic = searchParams.get('topic') as TopicSlug | null;
  const activeTopic: TopicSlug = useMemo(() => {
    if (rawTopic && (TOPICS as readonly string[]).includes(rawTopic)) {
      return rawTopic as TopicSlug;
    }
    return 'all';
  }, [rawTopic]);

  const onTopicChange = useCallback(
    (next: TopicSlug) => {
      const params = new URLSearchParams(searchParams);
      if (next === 'all') {
        params.delete('topic');
      } else {
        params.set('topic', next);
      }
      // `replace: true` keeps the back button behaving like a real filter
      // rather than piling up each chip click in history.
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // --- Data fetching ---------------------------------------------------------
  const learnHeader = useSiteSetting<LearnHeaderCopy>('learnHeader', locale);
  const startHereSetting = useSiteSetting<StartHereCopy>('startHere', locale);
  const articlesQuery = useArticles(locale);
  const seriesQuery = useSeries(locale);
  const faqsQuery = useFaqs(locale);
  const resourcesQuery = useResources(locale);

  const allArticles = articlesQuery.data ?? [];
  const visibleArticles = useMemo(
    () => (showDrafts ? allArticles : allArticles.filter((a) => a.status === 'published')),
    [allArticles, showDrafts],
  );

  const filteredArticles = useMemo(() => {
    if (activeTopic === 'all') return visibleArticles;
    return visibleArticles.filter((a) => a.topic === activeTopic);
  }, [visibleArticles, activeTopic]);

  // --- Start Here row --------------------------------------------------------
  // The `startHere` site-setting doc carries locale-independent ordering in
  // its `data.articleSlugs` field. Each slug is resolved against the visible
  // article pool; missing slugs are silently dropped so the row keeps working
  // while drafts ship.
  const startHereSlugs = useMemo(() => {
    const raw = startHereSetting.data?.data?.articleSlugs;
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
  }, [startHereSetting.data]);

  const startHereArticles = useMemo<PublicArticle[]>(() => {
    const pool = showDrafts ? allArticles : allArticles.filter((a) => a.status === 'published');
    return startHereSlugs
      .map((slug) => pool.find((a) => a.slug === slug))
      .filter((a): a is PublicArticle => Boolean(a));
  }, [startHereSlugs, allArticles, showDrafts]);

  // --- Series block ----------------------------------------------------------
  // Use the first series (there is only one today; if we ever have many we'll
  // render them as a carousel).
  const featuredSeries = seriesQuery.data?.[0];
  const featuredSeriesArticles = useMemo<PublicArticle[]>(() => {
    if (!featuredSeries) return [];
    const pool = showDrafts ? allArticles : allArticles.filter((a) => a.status === 'published');
    return featuredSeries.articleSlugs
      .map((slug) => pool.find((a) => a.slug === slug))
      .filter((a): a is PublicArticle => Boolean(a) && a!.series === featuredSeries.slug);
  }, [featuredSeries, allArticles, showDrafts]);

  // --- FAQ + resource previews ----------------------------------------------
  const faqPreviews = (faqsQuery.data ?? []).slice(0, 3);
  const resourcePreviews = (resourcesQuery.data ?? []).slice(0, 3);

  const headerTitle = learnHeader.data?.value.title ?? (t('learn.title') as string);
  const headerDescription =
    learnHeader.data?.value.description ?? (t('learn.description') as string);
  const startHereCopy = startHereSetting.data?.value;

  return (
    <>
      <SeoHead
        title={headerTitle}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/learn', locale)}
        alternatePath="/learn"
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.learn'), url: canonicalFor('/learn', locale) },
        ])}
      />
      <Container className="py-16">
        <Breadcrumbs
          items={buildBreadcrumbs('/learn').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/learn' ? undefined : localizePath(n.path),
          }))}
        />
        {/* Header */}
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold md:text-6xl">
            {headerTitle}
          </h1>
          <p className="text-ink/70 dark:text-paper/70 mt-4 text-lg">{headerDescription}</p>
        </header>

        {showDrafts ? (
          <p className="border-accent-400/40 bg-accent-50 text-primary-800 dark:border-accent-400/30 dark:bg-primary-800 dark:text-accent-200 mx-auto mt-6 max-w-2xl rounded-xl border px-4 py-3 text-center text-sm">
            {t('learn.drafts.notice')}
          </p>
        ) : null}

        {/* Start Here */}
        {startHereArticles.length > 0 ? (
          <div className="mt-12">
            <StartHereSteps
              articles={startHereArticles}
              eyebrow={startHereCopy?.eyebrow}
              title={startHereCopy?.title}
              description={startHereCopy?.body}
            />
          </div>
        ) : articlesQuery.isLoading ? (
          <div className="mt-12">
            <Skeleton variant="card" className="h-64" />
          </div>
        ) : null}

        {/* Featured series */}
        {featuredSeries && featuredSeriesArticles.length > 0 ? (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="text-primary-700 dark:text-accent-300 font-serif text-2xl font-semibold md:text-3xl">
                {t('learn.series.heading')}
              </h2>
            </div>
            <SeriesCard series={featuredSeries} articles={featuredSeriesArticles} />
          </section>
        ) : null}

        {/* Article grid — topic-filterable. */}
        <section className="mt-20" aria-labelledby="articles-heading">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2
                id="articles-heading"
                className="text-primary-700 dark:text-accent-300 font-serif text-2xl font-semibold md:text-3xl"
              >
                {t('learn.articles.heading')}
              </h2>
              <p className="text-ink/60 dark:text-paper/60 mt-2 text-sm">
                {t('learn.topics.heading')}
              </p>
            </div>
            <Link
              to={localizePath('/learn/articles')}
              className="text-primary-600 hover:text-primary-700 dark:text-accent-400 text-sm font-semibold"
            >
              {t('home.sections.viewAll')} {arrow}
            </Link>
          </div>

          <TopicChips value={activeTopic} onChange={onTopicChange} className="mb-10" />

          {articlesQuery.isLoading && visibleArticles.length === 0 ? (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="contents">
                  <Skeleton variant="card" className="h-80" />
                </li>
              ))}
            </ul>
          ) : filteredArticles.length === 0 ? (
            <p className="border-primary-500/30 text-ink/60 dark:border-primary-700/60 dark:text-paper/60 rounded-2xl border border-dashed p-8 text-center">
              {t('learn.articles.empty')}
            </p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((a) => (
                <li key={a.slug} className="contents">
                  <ArticleGridCard article={a} dateLocale={dateLocale} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FAQ + Resources previews */}
        <section className="mt-24 grid gap-6 md:grid-cols-2">
          {/* FAQ preview */}
          <div className="card flex flex-col p-8">
            <p className="text-accent-500 font-serif text-sm uppercase tracking-widest">
              {t('learn.faqPreview.eyebrow')}
            </p>
            <h3 className="text-primary-700 dark:text-accent-300 mt-2 font-serif text-2xl font-semibold">
              {t('learn.faqPreview.title')}
            </h3>
            <ul className="mt-6 flex-1 space-y-3">
              {faqPreviews.map((f) => (
                <li
                  key={f.id}
                  className="text-ink/80 dark:text-paper/80 flex items-start gap-3 text-sm"
                >
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="text-primary-400 dark:text-accent-400 shrink-0 -rotate-90"
                  />
                  <span className="leading-relaxed">{f.question}</span>
                </li>
              ))}
            </ul>
            <Link
              to={localizePath('/faq')}
              className="text-primary-600 hover:text-primary-700 dark:text-accent-400 mt-6 inline-flex items-center gap-2 text-sm font-semibold"
            >
              {t('learn.faqPreview.seeAll')}
              <ArrowRight size={14} aria-hidden="true" className={arrowIconClass} />
            </Link>
          </div>

          {/* Resources preview */}
          <div className="card flex flex-col p-8">
            <p className="text-accent-500 font-serif text-sm uppercase tracking-widest">
              {t('learn.resourcesPreview.eyebrow')}
            </p>
            <h3 className="text-primary-700 dark:text-accent-300 mt-2 font-serif text-2xl font-semibold">
              {t('learn.resourcesPreview.title')}
            </h3>
            <ul className="mt-6 flex-1 space-y-3">
              {resourcePreviews.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:bg-primary-50 dark:hover:bg-primary-700/40 group flex items-start justify-between gap-3 rounded-lg p-2 transition-colors"
                  >
                    <div>
                      <p className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 font-serif text-base font-semibold">
                        {r.title}
                      </p>
                      <p className="text-ink/60 dark:text-paper/60 text-xs">{r.description}</p>
                    </div>
                    <ExternalLink
                      size={14}
                      aria-hidden="true"
                      className="text-primary-400 dark:text-accent-400 mt-1 shrink-0"
                    />
                  </a>
                </li>
              ))}
            </ul>
            <Link
              to={localizePath('/resources')}
              className="text-primary-600 hover:text-primary-700 dark:text-accent-400 mt-6 inline-flex items-center gap-2 text-sm font-semibold"
            >
              {t('learn.resourcesPreview.seeAll')}
              <ArrowRight size={14} aria-hidden="true" className={arrowIconClass} />
            </Link>
          </div>
        </section>

        {/* Reference the full-library view so the crawl surface is clear. */}
        <p className="text-ink/60 dark:text-paper/60 mt-16 text-center text-sm">
          {allArticles.length > 0 ? (
            <Link
              to={localizePath('/learn/articles')}
              className="text-primary-600 hover:text-primary-700 dark:text-accent-400 font-semibold"
            >
              {t('home.sections.viewAll')} {arrow}
            </Link>
          ) : null}
        </p>
      </Container>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Grid card — kept local to the Learn page so its layout is easy to evolve.  */
/* -------------------------------------------------------------------------- */

interface ArticleGridCardProps {
  article: PublicArticle;
  dateLocale: string;
}

function ArticleGridCard({ article, dateLocale }: ArticleGridCardProps) {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const { slug, tags, topic, publishedAt, status, title, excerpt, body } = article;
  const isDraft = status === 'draft';

  const topicLabel = topic ? (t(`learn.topics.${topic}`) as string) : undefined;

  return (
    <Link
      to={localizePath(`/learn/articles/${slug}`)}
      className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
    >
      <ArticleCover slug={slug} label={topicLabel} image={article.heroImage} alt={title} />
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 font-serif text-xl font-semibold">
          {title}
          {isDraft ? (
            <span className="bg-accent-100 text-accent-700 ms-2 rounded px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider">
              {t('learn.drafts.badge')}
            </span>
          ) : null}
        </h3>
        <p className="text-ink/70 dark:text-paper/70 mt-2 flex-1 text-sm">{excerpt}</p>
        {tags && tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tg) => (
              <li
                key={tg}
                className="bg-primary-50 text-primary-700 dark:bg-primary-700/60 dark:text-accent-200 rounded-full px-2 py-0.5 text-[11px] font-medium"
              >
                {tg}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="text-ink/50 dark:text-paper/60 mt-5 flex items-center justify-between text-xs">
          <span>{formatDate(publishedAt, dateLocale)}</span>
          <span>{t('learn.readingTime', { minutes: readingTimeMinutes(body) })}</span>
        </div>
      </div>
    </Link>
  );
}
