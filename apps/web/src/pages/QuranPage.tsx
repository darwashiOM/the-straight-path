import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';
import { canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

interface QuranBannerCopy {
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  ctaUrl?: string;
}

interface QuranAboutCopy {
  title: string;
  body: string;
}

export default function QuranPage() {
  const { t } = useTranslation();
  const { locale } = useLocalizedPath();
  const meta = getRouteMeta('/quran')!;
  const arrowIconClass = locale === 'ar' ? 'rotate-180' : undefined;

  const banner = useSiteSetting<QuranBannerCopy>('quranBanner', locale);
  const about = useSiteSetting<QuranAboutCopy>('quranAbout', locale);

  const bannerCopy = banner.data?.value;
  const aboutCopy = about.data?.value;
  const ctaUrl = bannerCopy?.ctaUrl ?? 'https://quran.com/';

  const seoTitle = bannerCopy?.headline ?? (t('quranPage.headline') as string);

  return (
    <>
      <SeoHead
        title={seoTitle}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/quran', locale)}
        alternatePath="/quran"
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.quran'), url: canonicalFor('/quran', locale) },
        ])}
      />
      <section className="bg-gradient-to-b from-primary-50 to-paper py-24 dark:from-primary-800 dark:to-primary-900">
        <Container className="text-center">
          {bannerCopy ? (
            <>
              <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
                {bannerCopy.eyebrow}
              </p>
              <h1 className="mx-auto mt-3 max-w-3xl text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
                {bannerCopy.headline}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70 dark:text-paper/80">
                {bannerCopy.body}
              </p>
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-8"
              >
                {bannerCopy.cta} <ArrowRight size={16} className={arrowIconClass} />
              </a>
            </>
          ) : (
            <Skeleton variant="text-line" lines={4} className="mx-auto max-w-2xl" />
          )}
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            {aboutCopy ? (
              <>
                <h2 className="font-serif text-3xl font-semibold text-primary-700 dark:text-accent-300">
                  {aboutCopy.title}
                </h2>
                <div className="prose prose-lg mt-6 dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aboutCopy.body}</ReactMarkdown>
                </div>
              </>
            ) : (
              <Skeleton variant="text-line" lines={6} />
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
