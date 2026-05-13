import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useChannels, useSiteSetting } from '@/lib/content';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

export default function SocialPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const meta = getRouteMeta('/social')!;
  const arrow = locale === 'ar' ? '←' : '→';

  const { data: channels = [], isLoading } = useChannels(locale);
  const header = useSiteSetting<{ title: string; description: string }>('socialHeader', locale);
  const headerTitle = header.data?.value.title || t('socialPage.title');
  const headerDescription = header.data?.value.description || t('socialPage.description');

  return (
    <>
      <SeoHead
        title={headerTitle}
        description={headerDescription || (locale === 'en' ? meta.description : undefined)}
        canonical={canonicalFor('/social', locale)}
        alternatePath="/social"
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.social'), url: canonicalFor('/social', locale) },
        ])}
      />
      <Container className="py-16">
        <Breadcrumbs
          items={buildBreadcrumbs('/social').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/social' ? undefined : localizePath(n.path),
          }))}
        />
        <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold">
          {headerTitle}
        </h1>
        <p className="text-ink/70 dark:text-paper/70 mt-4 max-w-prose text-lg">
          {headerDescription}
        </p>
        {isLoading && channels.length === 0 ? (
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <Skeleton variant="card" className="h-40" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {channels.map((c) => (
              <li key={c.id}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card group flex h-full flex-col p-6"
                >
                  <h2 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 font-serif text-xl font-semibold">
                    {c.name}
                  </h2>
                  <p className="text-ink/70 dark:text-paper/70 mt-2 text-sm">{c.description}</p>
                  <span className="text-primary-600 dark:text-accent-400 mt-4 text-xs font-semibold">
                    {t('socialPage.visitChannel')} {arrow}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
