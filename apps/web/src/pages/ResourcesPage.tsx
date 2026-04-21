import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

type ResourceKey = 'quranCom' | 'sunnahCom' | 'yaqeen' | 'bayyinah' | 'islamicAwareness';
type CategoryKey = 'quran' | 'hadith' | 'research' | 'study';

interface Resource {
  key: ResourceKey;
  url: string;
  category: CategoryKey;
}

/** External resources are keyed by an internal identifier and the display
 *  title/description come from the locale file so they translate cleanly. */
const resources: Resource[] = [
  { key: 'quranCom', url: 'https://quran.com/', category: 'quran' },
  { key: 'sunnahCom', url: 'https://sunnah.com/', category: 'hadith' },
  { key: 'yaqeen', url: 'https://yaqeeninstitute.org/', category: 'research' },
  { key: 'bayyinah', url: 'https://bayyinah.tv/', category: 'study' },
  {
    key: 'islamicAwareness',
    url: 'https://www.islamic-awareness.org/',
    category: 'research',
  },
];

export default function ResourcesPage() {
  const { t } = useTranslation();
  const { locale } = useLocalizedPath();
  const meta = getRouteMeta('/resources')!;

  return (
    <>
      <SeoHead
        title={t('resourcesPage.title')}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/resources', locale)}
        alternatePath="/resources"
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.resources'), url: canonicalFor('/resources', locale) },
        ])}
      />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          {t('resourcesPage.title')}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          {t('resourcesPage.description')}
        </p>
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {resources.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card group flex h-full flex-col p-6"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                  {t(`resourcesPage.categories.${r.category}`)}
                </span>
                <h2 className="mt-2 flex items-center gap-2 font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                  {t(`resourcesPage.items.${r.key}.title`)}
                  <ExternalLink size={14} aria-hidden="true" />
                </h2>
                <p className="mt-2 flex-1 text-sm text-ink/70 dark:text-paper/70">
                  {t(`resourcesPage.items.${r.key}.description`)}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
