import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import Skeleton from '@/components/Skeleton';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { usePage } from '@/lib/content';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';

export default function PrivacyPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const meta = getRouteMeta('/privacy')!;

  const { data: page, isLoading } = usePage('privacy', locale);
  const title = page?.title ?? (t('privacyPage.title') as string);

  return (
    <>
      <SeoHead
        title={title}
        description={locale === 'en' ? meta.description : undefined}
        canonical={canonicalFor('/privacy', locale)}
        alternatePath="/privacy"
      />
      <Container className="py-16">
        <Breadcrumbs
          items={buildBreadcrumbs('/privacy').map((n) => ({
            label: t(n.i18nKey) as string,
            to: n.path === '/privacy' ? undefined : localizePath(n.path),
          }))}
        />
        <div className="mx-auto max-w-3xl">
          <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold">
            {title}
          </h1>
          <div className="prose prose-lg dark:prose-invert mt-8">
            {page ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.body}</ReactMarkdown>
            ) : isLoading ? (
              <Skeleton variant="text-line" lines={8} />
            ) : null}
          </div>
        </div>
      </Container>
    </>
  );
}
