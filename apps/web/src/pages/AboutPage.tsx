import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/schema';

interface Principle {
  label: string;
  body: string;
}

export default function AboutPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const meta = getRouteMeta('/about')!;

  const principles = (t('aboutPage.principles', { returnObjects: true }) as Principle[]) ?? [];

  return (
    <>
      <SeoHead
        title={t('aboutPage.title')}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/about', locale)}
        alternatePath="/about"
        jsonLd={graph(
          organizationSchema(),
          breadcrumbSchema([
            { name: t('nav.home'), url: canonicalFor('/', locale) },
            { name: t('nav.about'), url: canonicalFor('/about', locale) },
          ]),
        )}
      />
      <Container className="py-16">
        <Breadcrumbs
          items={buildBreadcrumbs('/about').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/about' ? undefined : localizePath(n.path),
          }))}
        />
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            {t('aboutPage.title')}
          </h1>
          <div className="prose prose-lg mt-8 dark:prose-invert">
            <p>{t('aboutPage.intro')}</p>
            <h2>{t('aboutPage.principlesTitle')}</h2>
            <ul>
              {principles.map((p) => (
                <li key={p.label}>
                  <strong>{p.label}</strong> {p.body}
                </li>
              ))}
            </ul>
            <h2>{t('aboutPage.fundingTitle')}</h2>
            <p>{t('aboutPage.fundingBody')}</p>
          </div>
        </div>
      </Container>
    </>
  );
}
