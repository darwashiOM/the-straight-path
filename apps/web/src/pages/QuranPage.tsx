import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

export default function QuranPage() {
  const { t } = useTranslation();
  const { locale } = useLocalizedPath();
  const meta = getRouteMeta('/quran')!;
  const arrowIconClass = locale === 'ar' ? 'rotate-180' : undefined;

  return (
    <>
      <SeoHead
        title={t('quranPage.headline')}
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
          <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
            {t('quranPage.eyebrow')}
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
            {t('quranPage.headline')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70 dark:text-paper/80">
            {t('quranPage.body')}
          </p>
          <a
            href="https://quran.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-8"
          >
            {t('quranPage.cta')} <ArrowRight size={16} className={arrowIconClass} />
          </a>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-3xl font-semibold text-primary-700 dark:text-accent-300">
              {t('quranPage.aboutTitle')}
            </h2>
            <div className="prose prose-lg mt-6 dark:prose-invert">
              <p>{t('quranPage.aboutBody1')}</p>
              <p>{t('quranPage.aboutBody2')}</p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
