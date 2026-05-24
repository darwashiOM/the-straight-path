import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Link2,
  Mail,
  MessageSquare,
  Star,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import ArticleCover from '@/components/ArticleCover';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useArticle, usePublishedArticles, useSiteSetting } from '@/lib/content';
import type {
  FeaturedData,
  HomepageSection,
  HomepageSectionId,
  HomepageSectionsData,
  QuickLinkIcon,
  QuickLinkItem,
} from '@/lib/content-schema';
import { readingTimeMinutes } from '@/lib/reading-time';
import { graph, organizationSchema, websiteSchema } from '@/lib/schema';
import { cn, formatDate } from '@/lib/utils';

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

const HERO_PHRASES = ['Find Purpose and Inner Peace', 'Islam... the straight path'];

function HeroSection() {
  const { localizePath } = useLocalizedPath();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeOutTimer = window.setTimeout(() => setVisible(false), 2700);
    const swapTimer = window.setTimeout(() => {
      setPhraseIndex(1);
      setVisible(true);
    }, 3000);
    return () => {
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(swapTimer);
    };
  }, []);

  return (
    <section
      key="hero"
      className="relative flex min-h-[500px] flex-col items-center justify-center overflow-hidden px-6 py-20 md:min-h-[600px]"
    >
      <img
        src="/hero-masjid-nabawi.jpg"
        alt=""
        aria-hidden="true"
        width={1920}
        height={1080}
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      <div className="relative z-10 text-center">
        <p
          className={cn(
            'font-serif text-4xl font-bold text-white drop-shadow-lg transition-opacity duration-300 md:text-6xl',
            visible ? 'opacity-100' : 'opacity-0',
          )}
        >
          {HERO_PHRASES[phraseIndex]}
        </p>
      </div>

      <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          to={localizePath('/learn/articles')}
          className="bg-primary-700 hover:bg-primary-600 inline-flex min-h-12 items-center gap-2 rounded-full px-8 py-3 font-medium text-white shadow-lg transition-colors"
        >
          Explore Islam <ArrowRight size={16} />
        </Link>
        <Link
          to={localizePath('/quran')}
          className="text-ink hover:bg-paper inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3 font-medium shadow-lg transition-colors"
        >
          Read the Qur&apos;an
        </Link>
      </div>
    </section>
  );
}


export default function HomePage() {
  const { t } = useTranslation();
  const { localizePath, locale } = useLocalizedPath();
  const dateLocale = 'en-US';
  const arrow = '→';

  const quranBanner = useSiteSetting<QuranBannerCopy>('quranBanner', locale);
  const aboutPreview = useSiteSetting<AboutPreviewCopy>('aboutPreview', locale);
  const quickLinks = useSiteSetting('quickLinks', locale);
  const sectionsSetting = useSiteSetting('homepageSections', locale);
  const featuredSetting = useSiteSetting('featured', locale);
  const articlesQuery = usePublishedArticles(locale);

  const sections = ((sectionsSetting.data?.data as HomepageSectionsData | undefined)?.sections ?? [
    { id: 'hero', visible: true, order: 0 },
    { id: 'featured', visible: true, order: 1 },
    { id: 'learnRow', visible: true, order: 2 },
    { id: 'quranBanner', visible: true, order: 3 },
    { id: 'quickLinks', visible: true, order: 4 },
    { id: 'aboutPreview', visible: true, order: 5 },
  ]) as HomepageSection[];

  const featuredConfig = (featuredSetting.data?.data as FeaturedData | undefined) ?? {
    mode: 'newest' as const,
  };

  const manualFeatured = useArticle(
    featuredConfig.mode === 'manual' ? featuredConfig.articleSlug : undefined,
    locale,
  );

  const quickLinkItems = ((quickLinks.data?.data?.items as QuickLinkItem[] | undefined) ?? [])
    .filter((i) => i && i.visible !== false)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const quranCopy = quranBanner.data?.value;
  const aboutCopy = aboutPreview.data?.value;

  const articles = (articlesQuery.data ?? []).slice(0, 3);
  const manualMatch =
    featuredConfig.mode === 'manual' && manualFeatured.data?.status === 'published'
      ? manualFeatured.data
      : undefined;
  const featured = manualMatch ?? articles[0];

  const quranCtaUrl = quranCopy?.ctaUrl ?? 'https://quran.com/';

  const renderers: Record<HomepageSectionId, () => ReactNode> = {
    hero: () => <HeroSection />,
    featured: () => renderFeatured(),
    learnRow: () => renderLearnRow(),
    quranBanner: () => renderQuranBanner(),
    quickLinks: () => renderQuickLinks(),
    aboutPreview: () => renderAboutPreview(),
  };

  const orderedSections = sections
    .filter((s) => s && s.visible !== false)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  function renderFeatured() {
    if (featured) {
      return (
        <section key="featured" className="py-20">
          <Container>
            <Link
              to={localizePath(`/learn/articles/${featured.slug}`)}
              className="card group block overflow-hidden md:grid md:grid-cols-5"
            >
              <div className="col-span-2 md:aspect-auto">
                <ArticleCover
                  slug={featured.slug}
                  image={featured.heroImage}
                  alt={featured.title}
                  aspect="aspect-[4/3] md:aspect-auto md:h-full"
                  className="h-full"
                />
              </div>
              <div className="col-span-3 p-8 md:p-12">
                <span className="text-accent-500 text-xs font-semibold uppercase tracking-wider">
                  {t('home.featured.eyebrow')}
                </span>
                <h2 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 mt-3 font-serif text-3xl font-semibold md:text-4xl">
                  {featured.title}
                </h2>
                <p className="text-ink/70 dark:text-paper/70 mt-4">{featured.excerpt}</p>
                <span className="text-primary-600 dark:text-accent-400 mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                  {t('home.featured.readArticle')} <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </Container>
        </section>
      );
    }

    if (articlesQuery.isLoading) {
      return (
        <section key="featured" className="py-20">
          <Container>
            <Skeleton variant="card" className="h-72" />
          </Container>
        </section>
      );
    }

    return null;
  }

  function renderLearnRow() {
    return (
      <section key="learnRow" className="dark:bg-primary-800/40 bg-white py-20">
        <Container>
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-accent-500 font-serif text-sm uppercase tracking-widest">
                <BookOpen size={14} className="mb-0.5 inline" /> {t('home.learnEyebrow')}
              </p>
              <h2 className="text-primary-700 dark:text-accent-300 mt-2 font-serif text-3xl font-semibold md:text-4xl">
                {t('home.sections.learn')}
              </h2>
              <p className="text-ink/60 dark:text-paper/70 mt-3 max-w-xl text-sm">
                {t('learn.description')}
              </p>
            </div>
            <Link
              to={localizePath('/learn')}
              className="text-primary-600 hover:text-primary-700 dark:text-accent-400 text-sm font-semibold"
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
                    <ArticleCover
                      slug={a.slug}
                      label={topicLabel}
                      image={a.heroImage}
                      alt={a.title}
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 font-serif text-xl font-semibold">
                        {a.title}
                      </h3>
                      <p className="text-ink/70 dark:text-paper/70 mt-2 flex-1 text-sm">
                        {a.excerpt}
                      </p>
                      <div className="text-ink/50 dark:text-paper/60 mt-5 flex items-center justify-between text-xs">
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
    );
  }

  function renderQuranBanner() {
    return (
      <section key="quranBanner" className="bg-primary-700 text-paper dark:bg-primary-900 py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            {quranCopy ? (
              <>
                <p className="text-accent-300 font-serif text-sm uppercase tracking-widest">
                  {quranCopy.eyebrow ?? t('home.sections.quran')}
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold md:text-5xl">
                  {quranCopy.headline}
                </h2>
                <p className="text-paper/80 mt-6 text-lg">{quranCopy.body}</p>
                <a
                  href={quranCtaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent mt-8 inline-flex items-center gap-2"
                >
                  {quranCopy.cta} <ArrowRight size={16} />
                </a>
              </>
            ) : (
              <Skeleton variant="text-line" lines={4} className="mx-auto max-w-2xl" />
            )}
          </div>
        </Container>
      </section>
    );
  }

  function renderQuickLinks() {
    return (
      <section key="quickLinks" className="py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {quickLinkItems.map((item, idx) => {
              const Icon = QUICK_LINK_ICON_MAP[item.icon] ?? Users;

              return (
                <FeatureLink
                  key={`${item.to}-${idx}`}
                  to={localizePath(item.to)}
                  icon={<Icon size={20} />}
                  title={item.labelEn}
                  desc={item.descEn}
                  exploreLabel={t('home.quickLinks.explore')}
                  arrow={arrow}
                />
              );
            })}
          </div>
        </Container>
      </section>
    );
  }

  function renderAboutPreview() {
    return (
      <section key="aboutPreview" className="bg-paper dark:bg-primary-900 py-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            {aboutCopy ? (
              <>
                <p className="text-accent-500 font-serif text-sm uppercase tracking-widest">
                  {aboutCopy.eyebrow}
                </p>
                <h2 className="text-primary-700 dark:text-accent-300 mt-3 font-serif text-4xl font-semibold">
                  {aboutCopy.headline}
                </h2>
                <p className="text-ink/70 dark:text-paper/80 mt-6 text-lg">{aboutCopy.body}</p>
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
    );
  }

  return (
    <>
      <SeoHead alternatePath="/" jsonLd={graph(websiteSchema(), organizationSchema())} />
      {orderedSections.map((s) => {
        const renderFn = renderers[s.id];
        return renderFn ? renderFn() : null;
      })}
    </>
  );
}

const QUICK_LINK_ICON_MAP: Record<QuickLinkIcon, LucideIcon> = {
  users: Users,
  link: Link2,
  help: HelpCircle,
  message: MessageSquare,
  book: BookOpen,
  star: Star,
  mail: Mail,
};

function FeatureLink({
  to,
  icon,
  title,
  desc,
  exploreLabel,
  arrow,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  desc: string;
  exploreLabel: string;
  arrow: string;
}) {
  return (
    <Link to={to} className="card group flex flex-col p-6 transition-all hover:-translate-y-0.5">
      <div className="bg-primary-50 text-primary-700 dark:bg-primary-800 dark:text-accent-300 mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full">
        {icon}
      </div>
      <h3 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 font-serif text-lg font-semibold">
        {title}
      </h3>
      <p className="text-ink/70 dark:text-paper/70 mt-2 text-sm">{desc}</p>
      <span className="text-primary-600 dark:text-accent-400 mt-4 text-xs font-semibold">
        {exploreLabel} {arrow}
      </span>
    </Link>
  );
}
