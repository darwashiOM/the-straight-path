import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useChannels } from '@/lib/content';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

export default function SocialPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const meta = getRouteMeta('/social')!;
  const arrow = locale === 'ar' ? '←' : '→';

  const { data: channels = [], isLoading } = useChannels(locale);

  return (
    <>
      <SeoHead
        title={t('socialPage.title')}
        description={locale === 'en' ? meta.description : undefined}
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
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          {t('socialPage.title')}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          {t('socialPage.description')}
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
                  <h2 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                    {c.name}
                  </h2>
                  <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">{c.description}</p>
                  <span className="mt-4 text-xs font-semibold text-primary-600 dark:text-accent-400">
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
