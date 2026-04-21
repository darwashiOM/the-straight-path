import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { canonicalFor, getRouteMeta } from '@/lib/routes';

export default function TermsPage() {
  const { t } = useTranslation();
  const { locale } = useLocalizedPath();
  const meta = getRouteMeta('/terms')!;

  return (
    <>
      <SeoHead
        title={t('termsPage.title')}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/terms', locale)}
        alternatePath="/terms"
      />
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            {t('termsPage.title')}
          </h1>
          <div className="prose prose-lg mt-8 dark:prose-invert">
            <p>{t('termsPage.lastUpdated')}</p>
            <p>{t('termsPage.intro')}</p>
            <ul>
              <li>{t('termsPage.items.accuracy')}</li>
              <li>
                {t('termsPage.items.licensePrefix')}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('termsPage.items.licenseLink')}
                </a>
                {t('termsPage.items.licenseSuffix')}
              </li>
              <li>{t('termsPage.items.abuse')}</li>
            </ul>
          </div>
        </div>
      </Container>
    </>
  );
}
