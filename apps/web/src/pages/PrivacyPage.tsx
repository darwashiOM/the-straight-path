import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { canonicalFor, getRouteMeta } from '@/lib/routes';

interface CollectItem {
  label: string;
  body: string;
}

export default function PrivacyPage() {
  const { t } = useTranslation();
  const { locale } = useLocalizedPath();
  const meta = getRouteMeta('/privacy')!;

  const collectItems =
    (t('privacyPage.collectItems', { returnObjects: true }) as CollectItem[]) ?? [];
  const whatWeDont = (t('privacyPage.whatWeDont', { returnObjects: true }) as string[]) ?? [];

  return (
    <>
      <SeoHead
        title={t('privacyPage.title')}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/privacy', locale)}
        alternatePath="/privacy"
      />
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            {t('privacyPage.title')}
          </h1>
          <div className="prose prose-lg mt-8 dark:prose-invert">
            <p>{t('privacyPage.lastUpdated')}</p>
            <p>{t('privacyPage.intro')}</p>
            <h2>{t('privacyPage.whatWeCollect')}</h2>
            <ul>
              {collectItems.map((item) => (
                <li key={item.label}>
                  <strong>{item.label}</strong> {item.body}
                </li>
              ))}
            </ul>
            <h2>{t('privacyPage.whatWeDontTitle')}</h2>
            <ul>
              {whatWeDont.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <h2>{t('privacyPage.rightsTitle')}</h2>
            <p>{t('privacyPage.rightsBody')}</p>
          </div>
        </div>
      </Container>
    </>
  );
}
