import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, HelpCircle, Link2, MessageSquare, Users } from 'lucide-react';

import ArticleCover from '@/components/ArticleCover';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { getPublishedArticles } from '@/content/articles';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { graph, organizationSchema, websiteSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const articles = getPublishedArticles().slice(0, 3);
  const featured = articles[0];
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';
  const arrow = locale === 'ar' ? '←' : '→';
  const arrowIconClass = locale === 'ar' ? 'rotate-180' : undefined;

  const translateArticleTitle = (slug: string, fallback: string) =>
    i18n.exists(`articles.${slug}.title`) ? (t(`articles.${slug}.title`) as string) : fallback;
  const translateArticleExcerpt = (slug: string, fallback: string) =>
    i18n.exists(`articles.${slug}.excerpt`)
      ? (t(`articles.${slug}.excerpt`) as string)
      : fallback;

  return (
    <>
      <SeoHead alternatePath="/" jsonLd={graph(websiteSchema(), organizationSchema())} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-paper py-24 md:py-32 dark:from-primary-800 dark:to-primary-900">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 font-serif text-sm uppercase tracking-widest text-accent-500">
              {t('home.hero.eyebrow')}
            </p>
            <h1 className="text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-7xl">
              {t('home.hero.title')}
            </h1>
            <p className="text-pretty mt-6 text-lg text-ink/70 dark:text-paper/80 md:text-xl">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to={localizePath('/learn/articles')} className="btn-primary">
                {t('home.hero.ctaPrimary')}{' '}
                <ArrowRight size={16} aria-hidden="true" className={arrowIconClass} />
              </Link>
              <Link to={localizePath('/quran')} className="btn-ghost">
                {t('home.hero.ctaSecondary')}
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured article */}
      {featured ? (
        <section className="py-20">
          <Container>
            <Link
              to={localizePath(`/learn/articles/${featured.frontmatter.slug}`)}
              className="card group block overflow-hidden md:grid md:grid-cols-5"
            >
              <div className="col-span-2 aspect-[4/3] bg-gradient-to-br from-primary-200 to-accent-200 md:aspect-auto" />
              <div className="col-span-3 p-8 md:p-12">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                  {t('home.featured.eyebrow')}
                </span>
                <h2 className="mt-3 font-serif text-3xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300 md:text-4xl">
                  {translateArticleTitle(featured.frontmatter.slug, featured.frontmatter.title)}
                </h2>
                <p className="mt-4 text-ink/70 dark:text-paper/70">
                  {translateArticleExcerpt(featured.frontmatter.slug, featured.frontmatter.excerpt)}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-accent-400">
                  {t('home.featured.readArticle')}{' '}
                  <ArrowRight size={14} className={arrowIconClass} />
                </span>
              </div>
            </Link>
          </Container>
        </section>
      ) : null}

      {/* Learn section */}
      <section className="bg-white py-20 dark:bg-primary-800/40">
        <Container>
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
                <BookOpen size={14} className="mb-0.5 inline" /> {t('home.learnEyebrow')}
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-primary-700 dark:text-accent-300 md:text-4xl">
                {t('home.sections.learn')}
              </h2>
              <p className="mt-3 max-w-xl text-sm text-ink/60 dark:text-paper/70">
                {t('learn.description')}
              </p>
            </div>
            <Link
              to={localizePath('/learn')}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-accent-400"
            >
              {t('home.sections.viewAll')} {arrow}
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {articles.map((a) => {
              const topic = a.frontmatter.topic;
              const topicLabel = topic ? (t(`learn.topics.${topic}`) as string) : undefined;
              return (
                <Link
                  key={a.frontmatter.slug}
                  to={localizePath(`/learn/articles/${a.frontmatter.slug}`)}
                  className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
                >
                  <ArticleCover slug={a.frontmatter.slug} label={topicLabel} />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                      {translateArticleTitle(a.frontmatter.slug, a.frontmatter.title)}
                    </h3>
                    <p className="mt-2 flex-1 text-sm text-ink/70 dark:text-paper/70">
                      {translateArticleExcerpt(a.frontmatter.slug, a.frontmatter.excerpt)}
                    </p>
                    <div className="mt-5 flex items-center justify-between text-xs text-ink/50 dark:text-paper/60">
                      <span>{formatDate(a.frontmatter.publishedAt, dateLocale)}</span>
                      <span>{t('learn.readingTime', { minutes: a.readingTime })}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Qur'an banner */}
      <section className="bg-primary-700 py-20 text-paper dark:bg-primary-900">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-serif text-sm uppercase tracking-widest text-accent-300">
              {t('home.sections.quran')}
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold md:text-5xl">
              {t('home.quranBanner.headline')}
            </h2>
            <p className="mt-6 text-lg text-paper/80">{t('home.quranBanner.body')}</p>
            <a
              href="https://quran.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent mt-8"
            >
              {t('home.quranBanner.cta')} <ArrowRight size={16} className={arrowIconClass} />
            </a>
          </div>
        </Container>
      </section>

      {/* Quick links grid */}
      <section className="py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureLink
              to={localizePath('/social')}
              icon={<Users size={20} />}
              title={t('home.sections.social')}
              desc={t('home.quickLinks.socialDesc')}
              exploreLabel={t('home.quickLinks.explore')}
              arrow={arrow}
            />
            <FeatureLink
              to={localizePath('/resources')}
              icon={<Link2 size={20} />}
              title={t('home.sections.resources')}
              desc={t('home.quickLinks.resourcesDesc')}
              exploreLabel={t('home.quickLinks.explore')}
              arrow={arrow}
            />
            <FeatureLink
              to={localizePath('/faq')}
              icon={<HelpCircle size={20} />}
              title={t('home.sections.faq')}
              desc={t('home.quickLinks.faqDesc')}
              exploreLabel={t('home.quickLinks.explore')}
              arrow={arrow}
            />
            <FeatureLink
              to={localizePath('/contact')}
              icon={<MessageSquare size={20} />}
              title={t('home.quickLinks.contactTitle')}
              desc={t('home.quickLinks.contactDesc')}
              exploreLabel={t('home.quickLinks.explore')}
              arrow={arrow}
            />
          </div>
        </Container>
      </section>

      {/* About preview */}
      <section className="bg-paper py-20 dark:bg-primary-900">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
              {t('home.sections.about')}
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold text-primary-700 dark:text-accent-300">
              {t('home.aboutPreview.headline')}
            </h2>
            <p className="mt-6 text-lg text-ink/70 dark:text-paper/80">
              {t('home.aboutPreview.body')}
            </p>
            <Link to={localizePath('/about')} className="btn-ghost mt-8">
              {t('home.aboutPreview.cta')}
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

function FeatureLink({
  to,
  icon,
  title,
  desc,
  exploreLabel,
  arrow,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  exploreLabel: string;
  arrow: string;
}) {
  return (
    <Link to={to} className="card group flex flex-col p-6 transition-all hover:-translate-y-0.5">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-800 dark:text-accent-300">
        {icon}
      </div>
      <h3 className="font-serif text-lg font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
        {title}
      </h3>
      <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">{desc}</p>
      <span className="mt-4 text-xs font-semibold text-primary-600 dark:text-accent-400">
        {exploreLabel} {arrow}
      </span>
    </Link>
  );
}
