import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import ArticleCover from '@/components/ArticleCover';
import Skeleton from '@/components/Skeleton';
import TopicChips, { TOPICS, type TopicSlug } from '@/components/TopicChips';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useArticles, useSiteSetting, type PublicArticle } from '@/lib/content';
import { readingTimeMinutes } from '@/lib/reading-time';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

interface ArticlesHeaderCopy {
  title: string;
  description: string;
}

/**
 * The "full library" view. Complements Learn (the curated hub) by letting
 * visitors scan every article with the same topic chip filter. Drafts show
 * when `?showDrafts=1` is present — admin integration is deliberately
 * decoupled from this page.
 */
export default function ArticleIndexPage() {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const [searchParams, setSearchParams] = useSearchParams();
  const meta = getRouteMeta('/learn/articles')!;
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';

  const showDrafts = searchParams.get('showDrafts') === '1';

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
      if (next === 'all') params.delete('topic');
      else params.set('topic', next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const header = useSiteSetting<ArticlesHeaderCopy>('articlesHeader', locale);
  const articlesQuery = useArticles(locale);

  const visibleArticles = useMemo(() => {
    const pool = articlesQuery.data ?? [];
    return showDrafts ? pool : pool.filter((a) => a.status === 'published');
  }, [articlesQuery.data, showDrafts]);

  const filteredArticles = useMemo(() => {
    if (activeTopic === 'all') return visibleArticles;
    return visibleArticles.filter((a) => a.topic === activeTopic);
  }, [visibleArticles, activeTopic]);

  const headerTitle = header.data?.value.title ?? (t('articlesPage.title') as string);
  const headerDescription =
    header.data?.value.description ?? (t('articlesPage.description') as string);

  return (
    <>
      <SeoHead
        title={headerTitle}
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
        <Breadcrumbs
          items={buildBreadcrumbs('/learn/articles').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/learn/articles' ? undefined : localizePath(n.path),
          }))}
        />
        <header>
          <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold">
            {headerTitle}
          </h1>
          <p className="text-ink/70 dark:text-paper/70 mt-4 max-w-prose text-lg">
            {headerDescription}
          </p>
        </header>

        {showDrafts ? (
          <p className="border-accent-400/40 bg-accent-50 text-primary-800 dark:border-accent-400/30 dark:bg-primary-800 dark:text-accent-200 mt-6 max-w-2xl rounded-xl border px-4 py-3 text-sm">
            {t('learn.drafts.notice')}
          </p>
        ) : null}

        <div className="mt-10">
          <TopicChips value={activeTopic} onChange={onTopicChange} />
        </div>

        {articlesQuery.isLoading && visibleArticles.length === 0 ? (
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="contents">
                <Skeleton variant="card" className="h-80" />
              </li>
            ))}
          </ul>
        ) : filteredArticles.length === 0 ? (
          <p className="border-primary-500/30 text-ink/60 dark:border-primary-700/60 dark:text-paper/60 mt-12 rounded-2xl border border-dashed p-8 text-center">
            {t('learn.articles.empty')}
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((a) => (
              <li key={a.slug} className="contents">
                <IndexCard article={a} dateLocale={dateLocale} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

interface IndexCardProps {
  article: PublicArticle;
  dateLocale: string;
}

function IndexCard({ article, dateLocale }: IndexCardProps) {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const { slug, topic, tags, publishedAt, status, title, excerpt, body } = article;
  const topicLabel = topic ? (t(`learn.topics.${topic}`) as string) : undefined;
  const isDraft = status === 'draft';

  return (
    <Link
      to={localizePath(`/learn/articles/${slug}`)}
      className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
    >
      <ArticleCover slug={slug} label={topicLabel} image={article.heroImage} alt={title} />
      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 font-serif text-xl font-semibold">
          {title}
          {isDraft ? (
            <span className="bg-accent-100 text-accent-700 ms-2 rounded px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider">
              {t('articlesPage.draft')}
            </span>
          ) : null}
        </h2>
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
