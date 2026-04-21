import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import ArticleCover from '@/components/ArticleCover';
import SeriesCard from '@/components/SeriesCard';
import StartHereSteps from '@/components/StartHereSteps';
import TopicChips, { TOPICS, type TopicSlug } from '@/components/TopicChips';
import {
  articles as allArticles,
  getArticle,
  getArticlesInSeries,
  getVisibleArticles,
  type ArticleModule,
} from '@/content/articles';
import { series as allSeries } from '@/content/series';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

/** The three curated "Start here" slugs, in reading order. */
const START_HERE_SLUGS = [
  'what-is-islam',
  'why-did-god-create-you',
  '10-things-to-know-about-islam',
];

/** Keep a light FAQ preview list in sync with the FAQ page shape. */
interface FaqItem {
  q: string;
  a: string;
}

/** Small preview of the external resources block, mirroring ResourcesPage. */
const RESOURCE_PREVIEWS = [
  { key: 'quranCom', url: 'https://quran.com/', category: 'quran' as const },
  { key: 'sunnahCom', url: 'https://sunnah.com/', category: 'hadith' as const },
  { key: 'yaqeen', url: 'https://yaqeeninstitute.org/', category: 'research' as const },
];

export default function LearnPage() {
  const { t, i18n } = useTranslation();
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

  // --- Data slicing ----------------------------------------------------------
  const visibleArticles = getVisibleArticles(showDrafts);
  const filteredArticles = useMemo(() => {
    if (activeTopic === 'all') return visibleArticles;
    return visibleArticles.filter((a) => a.frontmatter.topic === activeTopic);
  }, [visibleArticles, activeTopic]);

  // Start-Here uses the full article pool (not filtered by topic or drafts)
  // because these are intentionally the first cards a newcomer sees. We only
  // fall back to "whatever is published" if a specific slug isn't available.
  const startHereArticles: ArticleModule[] = START_HERE_SLUGS
    .map((slug) => getArticle(slug))
    .filter((a): a is ArticleModule => {
      if (!a) return false;
      return !a.frontmatter.draft || showDrafts;
    });

  // Series block — use the first series in `series.ts` (there is only one
  // today; if we ever have many we'll render them as a carousel).
  const featuredSeries = allSeries[0];
  const featuredSeriesArticles = featuredSeries
    ? getArticlesInSeries(featuredSeries.slug, featuredSeries.articleSlugs, showDrafts)
    : [];

  // --- FAQ previews ----------------------------------------------------------
  const faqs = (t('faqPage.items', { returnObjects: true }) as FaqItem[]) ?? [];
  const faqPreviews = faqs.slice(0, 3);

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
        <Breadcrumbs
          items={buildBreadcrumbs('/learn').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/learn' ? undefined : localizePath(n.path),
          }))}
        />
        {/* Header */}
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
            {t('learn.title')}
          </h1>
          <p className="mt-4 text-lg text-ink/70 dark:text-paper/70">
            {t('learn.description')}
          </p>
        </header>

        {showDrafts ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-xl border border-accent-400/40 bg-accent-50 px-4 py-3 text-center text-sm text-primary-800 dark:border-accent-400/30 dark:bg-primary-800 dark:text-accent-200">
            {t('learn.drafts.notice')}
          </p>
        ) : null}

        {/* Start Here */}
        {startHereArticles.length > 0 ? (
          <div className="mt-12">
            <StartHereSteps articles={startHereArticles} />
          </div>
        ) : null}

        {/* Featured series */}
        {featuredSeries && featuredSeriesArticles.length > 0 ? (
          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 className="font-serif text-2xl font-semibold text-primary-700 dark:text-accent-300 md:text-3xl">
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
                className="font-serif text-2xl font-semibold text-primary-700 dark:text-accent-300 md:text-3xl"
              >
                {t('learn.articles.heading')}
              </h2>
              <p className="mt-2 text-sm text-ink/60 dark:text-paper/60">
                {t('learn.topics.heading')}
              </p>
            </div>
            <Link
              to={localizePath('/learn/articles')}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-accent-400"
            >
              {t('home.sections.viewAll')} {arrow}
            </Link>
          </div>

          <TopicChips value={activeTopic} onChange={onTopicChange} className="mb-10" />

          {filteredArticles.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-primary-500/30 p-8 text-center text-ink/60 dark:border-primary-700/60 dark:text-paper/60">
              {t('learn.articles.empty')}
            </p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((a) => (
                <li key={a.frontmatter.slug} className="contents">
                  <ArticleGridCard
                    article={a}
                    dateLocale={dateLocale}
                    title={translateArticleTitle(a.frontmatter.slug, a.frontmatter.title)}
                    excerpt={translateArticleExcerpt(
                      a.frontmatter.slug,
                      a.frontmatter.excerpt,
                    )}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FAQ + Resources previews */}
        <section className="mt-24 grid gap-6 md:grid-cols-2">
          {/* FAQ preview */}
          <div className="card flex flex-col p-8">
            <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
              {t('learn.faqPreview.eyebrow')}
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-primary-700 dark:text-accent-300">
              {t('learn.faqPreview.title')}
            </h3>
            <ul className="mt-6 flex-1 space-y-3">
              {faqPreviews.map((f) => (
                <li
                  key={f.q}
                  className="flex items-start gap-3 text-sm text-ink/80 dark:text-paper/80"
                >
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className="-rotate-90 shrink-0 text-primary-400 dark:text-accent-400"
                  />
                  <span className="leading-relaxed">{f.q}</span>
                </li>
              ))}
            </ul>
            <Link
              to={localizePath('/faq')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-accent-400"
            >
              {t('learn.faqPreview.seeAll')}
              <ArrowRight size={14} aria-hidden="true" className={arrowIconClass} />
            </Link>
          </div>

          {/* Resources preview */}
          <div className="card flex flex-col p-8">
            <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
              {t('learn.resourcesPreview.eyebrow')}
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-primary-700 dark:text-accent-300">
              {t('learn.resourcesPreview.title')}
            </h3>
            <ul className="mt-6 flex-1 space-y-3">
              {RESOURCE_PREVIEWS.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-primary-50 dark:hover:bg-primary-700/40"
                  >
                    <div>
                      <p className="font-serif text-base font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                        {t(`resourcesPage.items.${r.key}.title`)}
                      </p>
                      <p className="text-xs text-ink/60 dark:text-paper/60">
                        {t(`resourcesPage.items.${r.key}.description`)}
                      </p>
                    </div>
                    <ExternalLink
                      size={14}
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-primary-400 dark:text-accent-400"
                    />
                  </a>
                </li>
              ))}
            </ul>
            <Link
              to={localizePath('/resources')}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-accent-400"
            >
              {t('learn.resourcesPreview.seeAll')}
              <ArrowRight size={14} aria-hidden="true" className={arrowIconClass} />
            </Link>
          </div>
        </section>

        {/* Reference the full-library view so the crawl surface is clear. */}
        <p className="mt-16 text-center text-sm text-ink/60 dark:text-paper/60">
          {allArticles.length > 0 ? (
            <Link
              to={localizePath('/learn/articles')}
              className="font-semibold text-primary-600 hover:text-primary-700 dark:text-accent-400"
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
  article: ArticleModule;
  title: string;
  excerpt: string;
  dateLocale: string;
}

function ArticleGridCard({ article, title, excerpt, dateLocale }: ArticleGridCardProps) {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const { slug, tags, topic, publishedAt, draft } = article.frontmatter;

  const topicLabel = topic ? (t(`learn.topics.${topic}`) as string) : undefined;

  return (
    <Link
      to={localizePath(`/learn/articles/${slug}`)}
      className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
    >
      <ArticleCover slug={slug} label={topicLabel} />
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
          {title}
          {draft ? (
            <span className="ms-2 rounded bg-accent-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-accent-700">
              {t('learn.drafts.badge')}
            </span>
          ) : null}
        </h3>
        <p className="mt-2 flex-1 text-sm text-ink/70 dark:text-paper/70">{excerpt}</p>
        {tags && tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tg) => (
              <li
                key={tg}
                className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-700/60 dark:text-accent-200"
              >
                {tg}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex items-center justify-between text-xs text-ink/50 dark:text-paper/60">
          <span>{formatDate(publishedAt, dateLocale)}</span>
          <span>{t('learn.readingTime', { minutes: article.readingTime })}</span>
        </div>
      </div>
    </Link>
  );
}
