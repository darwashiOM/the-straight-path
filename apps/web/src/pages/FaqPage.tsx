import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useFaqs, useSiteSetting } from '@/lib/content';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema, faqSchema, graph } from '@/lib/schema';
import { cn } from '@/lib/utils';

export default function FaqPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const [open, setOpen] = useState<number | null>(0);
  const meta = getRouteMeta('/faq')!;

  const { data: faqs = [], isLoading } = useFaqs(locale);
  const schemaPairs = faqs.map((f) => ({ q: f.question, a: f.answer }));
  const header = useSiteSetting<{ title: string; description: string }>('faqHeader', locale);
  const headerTitle = header.data?.value.title || t('faqPage.title');
  const headerDescription = header.data?.value.description || t('faqPage.description');

  return (
    <>
      <SeoHead
        title={headerTitle}
        description={headerDescription || (locale === 'en' ? meta.description : undefined)}
        canonical={canonicalFor('/faq', locale)}
        alternatePath="/faq"
        jsonLd={graph(
          faqSchema(schemaPairs),
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
          {headerTitle}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          {headerDescription}
        </p>
        {isLoading && faqs.length === 0 ? (
          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height="3rem" />
            ))}
          </div>
        ) : (
          <ul className="mx-auto mt-12 max-w-3xl divide-y divide-primary-500/10 dark:divide-primary-700/40">
            {faqs.map((f, i) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 py-5 text-start"
                >
                  <span className="font-serif text-lg font-semibold text-primary-700 dark:text-accent-300">
                    {f.question}
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
                  <p className="animate-fade-in pb-5 pe-10 text-ink/70 dark:text-paper/70">
                    {f.answer}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
