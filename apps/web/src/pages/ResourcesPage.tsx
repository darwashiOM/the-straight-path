import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useResources } from '@/lib/content';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

export default function ResourcesPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const meta = getRouteMeta('/resources')!;

  const { data: resources = [], isLoading } = useResources(locale);

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
        <Breadcrumbs
          items={buildBreadcrumbs('/resources').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/resources' ? undefined : localizePath(n.path),
          }))}
        />
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          {t('resourcesPage.title')}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          {t('resourcesPage.description')}
        </p>
        {isLoading && resources.length === 0 ? (
          <ul className="mt-12 grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton variant="card" className="h-40" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-12 grid gap-4 md:grid-cols-2">
            {resources.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card group flex h-full flex-col p-6"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                    {t(`resourcesPage.categories.${r.category}`, {
                      defaultValue: r.category,
                    })}
                  </span>
                  <h2 className="mt-2 flex items-center gap-2 font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                    {r.title}
                    <ExternalLink size={14} aria-hidden="true" />
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-ink/70 dark:text-paper/70">
                    {r.description}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
