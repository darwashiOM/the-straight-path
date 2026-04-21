import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import ArticleCover from '@/components/ArticleCover';
import TopicChips, { TOPICS, type TopicSlug } from '@/components/TopicChips';
import { getVisibleArticles, type ArticleModule } from '@/content/articles';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

/**
 * The "full library" view. Complements Learn (the curated hub) by letting
 * visitors scan every article with the same topic chip filter. Drafts show
 * when `?showDrafts=1` is present — admin integration is deliberately
 * decoupled from this page.
 */
export default function ArticleIndexPage() {
  const { t, i18n } = useTranslation();
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

  const visibleArticles = getVisibleArticles(showDrafts);
  const filteredArticles = useMemo(() => {
    if (activeTopic === 'all') return visibleArticles;
    return visibleArticles.filter((a) => a.frontmatter.topic === activeTopic);
  }, [visibleArticles, activeTopic]);

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
        <Breadcrumbs
          items={buildBreadcrumbs('/learn/articles').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/learn/articles' ? undefined : localizePath(n.path),
          }))}
        />
        <header>
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            {t('articlesPage.title')}
          </h1>
          <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
            {t('articlesPage.description')}
          </p>
        </header>

        {showDrafts ? (
          <p className="mt-6 max-w-2xl rounded-xl border border-accent-400/40 bg-accent-50 px-4 py-3 text-sm text-primary-800 dark:border-accent-400/30 dark:bg-primary-800 dark:text-accent-200">
            {t('learn.drafts.notice')}
          </p>
        ) : null}

        <div className="mt-10">
          <TopicChips value={activeTopic} onChange={onTopicChange} />
        </div>

        {filteredArticles.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-dashed border-primary-500/30 p-8 text-center text-ink/60 dark:border-primary-700/60 dark:text-paper/60">
            {t('learn.articles.empty')}
          </p>
        ) : (
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((a) => (
              <li key={a.frontmatter.slug} className="contents">
                <IndexCard
                  article={a}
                  title={translateArticleTitle(a.frontmatter.slug, a.frontmatter.title)}
                  excerpt={translateArticleExcerpt(
                    a.frontmatter.slug,
                    a.frontmatter.excerpt,
                  )}
                  dateLocale={dateLocale}
                />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

interface IndexCardProps {
  article: ArticleModule;
  title: string;
  excerpt: string;
  dateLocale: string;
}

function IndexCard({ article, title, excerpt, dateLocale }: IndexCardProps) {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const { slug, topic, tags, publishedAt, draft } = article.frontmatter;
  const topicLabel = topic ? (t(`learn.topics.${topic}`) as string) : undefined;

  return (
    <Link
      to={localizePath(`/learn/articles/${slug}`)}
      className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
    >
      <ArticleCover slug={slug} label={topicLabel} />
      <div className="flex flex-1 flex-col p-6">
        <h2 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
          {title}
          {draft ? (
            <span className="ms-2 rounded bg-accent-100 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-accent-700">
              {t('articlesPage.draft')}
            </span>
          ) : null}
        </h2>
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
