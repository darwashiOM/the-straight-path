import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, HelpCircle, Link2, MessageSquare, Users } from 'lucide-react';

import ArticleCover from '@/components/ArticleCover';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { usePublishedArticles, useSiteSetting } from '@/lib/content';
import { readingTimeMinutes } from '@/lib/reading-time';
import { graph, organizationSchema, websiteSchema } from '@/lib/schema';
import { formatDate } from '@/lib/utils';

interface HeroCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

interface QuranBannerCopy {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  ctaUrl?: string;
}

interface AboutPreviewCopy {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
}

export default function HomePage() {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const dateLocale = locale === 'ar' ? 'ar' : 'en-US';
  const arrow = locale === 'ar' ? '←' : '→';
  const arrowIconClass = locale === 'ar' ? 'rotate-180' : undefined;

  const hero = useSiteSetting<HeroCopy>('hero', locale);
  const quranBanner = useSiteSetting<QuranBannerCopy>('quranBanner', locale);
  const aboutPreview = useSiteSetting<AboutPreviewCopy>('aboutPreview', locale);
  const articlesQuery = usePublishedArticles(locale);

  const heroCopy = hero.data?.value;
  const quranCopy = quranBanner.data?.value;
  const aboutCopy = aboutPreview.data?.value;

  const articles = (articlesQuery.data ?? []).slice(0, 3);
  const featured = articles[0];

  const quranCtaUrl = quranCopy?.ctaUrl ?? 'https://quran.com/';

  return (
    <>
      <SeoHead alternatePath="/" jsonLd={graph(websiteSchema(), organizationSchema())} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-paper py-24 md:py-32 dark:from-primary-800 dark:to-primary-900">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            {heroCopy ? (
              <>
                <p className="mb-4 font-serif text-sm uppercase tracking-widest text-accent-500">
                  {heroCopy.eyebrow}
                </p>
                <h1 className="text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-7xl">
                  {heroCopy.title}
                </h1>
                <p className="text-pretty mt-6 text-lg text-ink/70 dark:text-paper/80 md:text-xl">
                  {heroCopy.subtitle}
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                  <Link to={localizePath('/learn/articles')} className="btn-primary">
                    {heroCopy.ctaPrimary}{' '}
                    <ArrowRight size={16} aria-hidden="true" className={arrowIconClass} />
                  </Link>
                  <Link to={localizePath('/quran')} className="btn-ghost">
                    {heroCopy.ctaSecondary}
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Skeleton height="0.75rem" width={160} />
                <Skeleton height="3rem" width="80%" />
                <Skeleton variant="text-line" lines={2} className="w-full max-w-xl" />
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Featured article */}
      {featured ? (
        <section className="py-20">
          <Container>
            <Link
              to={localizePath(`/learn/articles/${featured.slug}`)}
              className="card group block overflow-hidden md:grid md:grid-cols-5"
            >
              <div className="col-span-2 aspect-[4/3] bg-gradient-to-br from-primary-200 to-accent-200 md:aspect-auto" />
              <div className="col-span-3 p-8 md:p-12">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                  {t('home.featured.eyebrow')}
                </span>
                <h2 className="mt-3 font-serif text-3xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300 md:text-4xl">
                  {featured.title}
                </h2>
                <p className="mt-4 text-ink/70 dark:text-paper/70">{featured.excerpt}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-accent-400">
                  {t('home.featured.readArticle')}{' '}
                  <ArrowRight size={14} className={arrowIconClass} />
                </span>
              </div>
            </Link>
          </Container>
        </section>
      ) : articlesQuery.isLoading ? (
        <section className="py-20">
          <Container>
            <Skeleton variant="card" className="h-72" />
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

          {articlesQuery.isLoading && articles.length === 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="card" className="h-80" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {articles.map((a) => {
                const topicLabel = a.topic ? (t(`learn.topics.${a.topic}`) as string) : undefined;
                return (
                  <Link
                    key={a.slug}
                    to={localizePath(`/learn/articles/${a.slug}`)}
                    className="card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5"
                  >
                    <ArticleCover slug={a.slug} label={topicLabel} />
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                        {a.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm text-ink/70 dark:text-paper/70">
                        {a.excerpt}
                      </p>
                      <div className="mt-5 flex items-center justify-between text-xs text-ink/50 dark:text-paper/60">
                        <span>{formatDate(a.publishedAt, dateLocale)}</span>
                        <span>
                          {t('learn.readingTime', { minutes: readingTimeMinutes(a.body) })}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </section>

      {/* Qur'an banner */}
      <section className="bg-primary-700 py-20 text-paper dark:bg-primary-900">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            {quranCopy ? (
              <>
                <p className="font-serif text-sm uppercase tracking-widest text-accent-300">
                  {quranCopy.eyebrow ?? t('home.sections.quran')}
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold md:text-5xl">
                  {quranCopy.headline}
                </h2>
                <p className="mt-6 text-lg text-paper/80">{quranCopy.body}</p>
                <a
                  href={quranCtaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent mt-8"
                >
                  {quranCopy.cta} <ArrowRight size={16} className={arrowIconClass} />
                </a>
              </>
            ) : (
              <Skeleton variant="text-line" lines={4} className="mx-auto max-w-2xl" />
            )}
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
            {aboutCopy ? (
              <>
                <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
                  {aboutCopy.eyebrow}
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold text-primary-700 dark:text-accent-300">
                  {aboutCopy.headline}
                </h2>
                <p className="mt-6 text-lg text-ink/70 dark:text-paper/80">{aboutCopy.body}</p>
                <Link to={localizePath('/about')} className="btn-ghost mt-8">
                  {aboutCopy.cta}
                </Link>
              </>
            ) : (
              <Skeleton variant="text-line" lines={4} className="mx-auto max-w-2xl" />
            )}
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
