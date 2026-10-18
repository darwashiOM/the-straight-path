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
      {/* One block: the about title as the gold eyebrow, the about text, then
          the Quran.com button (label and URL shared with the homepage banner). */}
      <section className="from-primary-50 to-paper dark:from-primary-800 dark:to-primary-900 bg-gradient-to-b py-20">
        <Container>
          <div className="mx-auto max-w-3xl">
            {aboutCopy && bannerCopy ? (
              <>
                <h1 className="text-accent-500 font-serif text-sm uppercase tracking-widest">
                  {aboutCopy.title}
                </h1>
                <div className="prose prose-lg dark:prose-invert mt-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aboutCopy.body}</ReactMarkdown>
                </div>
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-10"
                >
                  {bannerCopy.cta} <ArrowRight size={16} />
                </a>
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
