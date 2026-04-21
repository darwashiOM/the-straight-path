import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema, faqSchema, graph } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const [open, setOpen] = useState<number | null>(0);
  const meta = getRouteMeta('/faq')!;

  // `returnObjects` lets us pull the whole list in one call. Falling back to
  // an empty array keeps SSR and test environments safe if the key is missing.
  const faqs = (t('faqPage.items', { returnObjects: true }) as FaqItem[]) ?? [];

  return (
    <>
      <SeoHead
        title={t('faqPage.title')}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/faq', locale)}
        alternatePath="/faq"
        jsonLd={graph(
          faqSchema(faqs),
          breadcrumbSchema([
            { name: t('nav.home'), url: canonicalFor('/', locale) },
            { name: t('nav.faq'), url: canonicalFor('/faq', locale) },
          ]),
        )}
      />
      <Container className="py-16">
        <Breadcrumbs
          items={buildBreadcrumbs('/faq').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/faq' ? undefined : localizePath(n.path),
          }))}
        />
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          {t('faqPage.title')}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          {t('faqPage.description')}
        </p>
        <ul className="mx-auto mt-12 max-w-3xl divide-y divide-primary-500/10 dark:divide-primary-700/40">
          {faqs.map((f, i) => (
            <li key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-4 py-5 text-start"
              >
                <span className="font-serif text-lg font-semibold text-primary-700 dark:text-accent-300">
                  {f.q}
                </span>
                <ChevronDown
                  size={20}
                  className={cn(
                    'shrink-0 text-primary-600 transition-transform dark:text-accent-400',
                    open === i && 'rotate-180',
                  )}
                />
              </button>
              {open === i ? (
                <p className="animate-fade-in pb-5 pe-10 text-ink/70 dark:text-paper/70">{f.a}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
