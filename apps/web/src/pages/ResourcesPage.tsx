import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useResources, useSiteSetting } from '@/lib/content';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

export default function ResourcesPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const meta = getRouteMeta('/resources')!;

  const { data: resources = [], isLoading } = useResources(locale);
  const header = useSiteSetting<{ title: string; description: string }>('resourcesHeader', locale);
  const headerTitle = header.data?.value.title || t('resourcesPage.title');
  const headerDescription = header.data?.value.description || t('resourcesPage.description');

  return (
    <>
      <SeoHead
        title={headerTitle}
        description={headerDescription || (locale === 'en' ? meta.description : undefined)}
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
        <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold">
          {headerTitle}
        </h1>
        <p className="text-ink/70 dark:text-paper/70 mt-4 max-w-prose text-lg">
          {headerDescription}
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
                  <span className="text-accent-500 text-xs font-semibold uppercase tracking-wider">
                    {t(`resourcesPage.categories.${r.category}`, {
                      defaultValue: r.category,
                    })}
                  </span>
                  <h2 className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 mt-2 flex items-center gap-2 font-serif text-xl font-semibold">
                    {r.title}
                    <ExternalLink size={14} aria-hidden="true" />
                  </h2>
                  <p className="text-ink/70 dark:text-paper/70 mt-2 flex-1 text-sm">
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
