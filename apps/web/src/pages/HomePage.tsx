import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, HelpCircle, Link2, MessageSquare, Users } from 'lucide-react';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { getPublishedArticles } from '@/content/articles';
import { formatDate } from '@/lib/utils';

export default function HomePage() {
  const { t } = useTranslation();
  const articles = getPublishedArticles().slice(0, 3);
  const featured = articles[0];

  return (
    <>
      <SeoHead
        canonical="https://thestraightpath.app/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'The Straight Path',
          url: 'https://thestraightpath.app',
          inLanguage: ['en', 'ar'],
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-paper py-24 md:py-32 dark:from-primary-800 dark:to-primary-900">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 font-serif text-sm uppercase tracking-widest text-accent-500">
              {t('site.name')}
            </p>
            <h1 className="text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-7xl">
              {t('home.hero.title')}
            </h1>
            <p className="text-pretty mt-6 text-lg text-ink/70 dark:text-paper/80 md:text-xl">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/learn/articles" className="btn-primary">
                {t('home.hero.ctaPrimary')} <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link to="/quran" className="btn-ghost">
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
              to={`/learn/articles/${featured.frontmatter.slug}`}
              className="card group block overflow-hidden md:grid md:grid-cols-5"
            >
              <div className="col-span-2 aspect-[4/3] bg-gradient-to-br from-primary-200 to-accent-200 md:aspect-auto" />
              <div className="col-span-3 p-8 md:p-12">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                  Featured · Foundations
                </span>
                <h2 className="mt-3 font-serif text-3xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300 md:text-4xl">
                  {featured.frontmatter.title}
                </h2>
                <p className="mt-4 text-ink/70 dark:text-paper/70">
                  {featured.frontmatter.excerpt}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-accent-400">
                  Read article <ArrowRight size={14} />
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
                <BookOpen size={14} className="mb-0.5 inline" /> Learn
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-primary-700 dark:text-accent-300 md:text-4xl">
                {t('home.sections.learn')}
              </h2>
            </div>
            <Link
              to="/learn/articles"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-accent-400"
            >
              View all →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.frontmatter.slug}
                to={`/learn/articles/${a.frontmatter.slug}`}
                className="card group flex flex-col overflow-hidden"
              >
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-accent-100" />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                    {a.frontmatter.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-ink/70 dark:text-paper/70">
                    {a.frontmatter.excerpt}
                  </p>
                  <span className="mt-4 text-xs uppercase tracking-wider text-ink/50 dark:text-paper/60">
                    {formatDate(a.frontmatter.publishedAt)}
                  </span>
                </div>
              </Link>
            ))}
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
              Read the Qur'ān — the word of God, preserved for over 1400 years.
            </h2>
            <p className="mt-6 text-lg text-paper/80">
              Quran.com offers the Qur'ān in many languages with a simple, clear interface.
            </p>
            <a
              href="https://quran.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent mt-8"
            >
              Open Quran.com <ArrowRight size={16} />
            </a>
          </div>
        </Container>
      </section>

      {/* Quick links grid */}
      <section className="py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureLink
              to="/social"
              icon={<Users size={20} />}
              title={t('home.sections.social')}
              desc="Curated short-form videos explaining Islam."
            />
            <FeatureLink
              to="/resources"
              icon={<Link2 size={20} />}
              title={t('home.sections.resources')}
              desc="Trusted external libraries and sites."
            />
            <FeatureLink
              to="/faq"
              icon={<HelpCircle size={20} />}
              title={t('home.sections.faq')}
              desc="Common questions — answered plainly."
            />
            <FeatureLink
              to="/contact"
              icon={<MessageSquare size={20} />}
              title="Get in touch"
              desc="Ask a question. We read every message."
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
              An invitation, not an argument.
            </h2>
            <p className="mt-6 text-lg text-ink/70 dark:text-paper/80">
              The Straight Path is a small, independent effort to share Islam in a calm,
              reader-first voice — pastoral rather than polemical, for seekers of every background.
            </p>
            <Link to="/about" className="btn-ghost mt-8">
              Read more about our mission
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
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="card group flex flex-col p-6 transition-all hover:-translate-y-0.5"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-800 dark:text-accent-300">
        {icon}
      </div>
      <h3 className="font-serif text-lg font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
        {title}
      </h3>
      <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">{desc}</p>
      <span className="mt-4 text-xs font-semibold text-primary-600 dark:text-accent-400">
        Explore →
      </span>
    </Link>
  );
}
