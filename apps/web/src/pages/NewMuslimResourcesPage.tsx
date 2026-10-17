import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CirclePlay,
  ExternalLink,
  FileText,
  ScrollText,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';
import {
  NEW_MUSLIM_LINK_GROUPS,
  type NewMuslimLink,
  type NewMuslimLinkIcon,
} from '@/lib/new-muslim-resources';
import { buildBreadcrumbs, canonicalFor } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

const PATH = '/new-muslim-resources';

/** The contact page opens its new-Muslim support section when `support=1` is set. */
const CONTACT_SUPPORT_PATH = '/contact?support=1';

/** Thumbnails in public/new-muslim-resources are square at this size. */
const THUMB_SIZE = 160;

const ICONS: Record<NewMuslimLinkIcon, LucideIcon> = {
  book: BookOpen,
  scroll: ScrollText,
  pdf: FileText,
  video: CirclePlay,
  app: Smartphone,
};

export default function NewMuslimResourcesPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();

  const header = useSiteSetting<{ title: string }>('newMuslimHeader', locale);
  const title = header.data?.value.title || t('newMuslimPage.title');

  return (
    <>
      <SeoHead
        title={title}
        canonical={canonicalFor(PATH, locale)}
        alternatePath={PATH}
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.newMuslimResources'), url: canonicalFor(PATH, locale) },
        ])}
      />
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs
            items={buildBreadcrumbs(PATH).map((n) => ({
              label: t(n.i18nKey) as string,
              to: n.path === PATH ? undefined : localizePath(n.path),
            }))}
          />
          <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold">
            {title}
          </h1>

          <WelcomeNote />

          <div id="links" className="mt-14 scroll-mt-24 space-y-10">
            {NEW_MUSLIM_LINK_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`group-${group.id}`}>
                <h2
                  id={`group-${group.id}`}
                  className="text-accent-500 text-xs font-semibold uppercase tracking-wider"
                >
                  {group.title}
                </h2>
                <ul className="mt-3 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.id}>
                      <ResourceRow link={link} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}

/**
 * The welcome message: a header band with the greeting (Arabic script, the
 * transliteration, and its meaning), then the short note in readable prose
 * ending with the link to the contact form.
 */
function WelcomeNote() {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();

  return (
    <section aria-labelledby="welcome-title" className="card mt-10 overflow-hidden hover:shadow-sm">
      <div className="bg-primary-50 border-primary-500/10 dark:bg-primary-900/60 dark:border-primary-700/40 border-b px-6 py-6 sm:px-8">
        <p
          lang="ar"
          dir="rtl"
          className="font-arabic text-accent-500 dark:text-accent-400 text-left text-2xl leading-relaxed"
        >
          {t('newMuslimPage.welcome.arabic')}
        </p>
        <h2
          id="welcome-title"
          className="text-primary-700 dark:text-accent-300 mt-2 font-serif text-2xl font-semibold leading-snug"
        >
          {t('newMuslimPage.welcome.greeting')}
        </h2>
        <p className="text-ink/60 dark:text-paper/60 mt-1.5 text-sm italic">
          {t('newMuslimPage.welcome.greetingMeaning')}
        </p>
      </div>
      <div className="text-ink/80 dark:text-paper/80 space-y-4 px-6 py-6 leading-relaxed sm:px-8">
        <p>{t('newMuslimPage.welcome.p1')}</p>
        <p>{t('newMuslimPage.welcome.p2')}</p>
        <p>{t('newMuslimPage.welcome.p3')}</p>
        <p>
          <Trans
            i18nKey="newMuslimPage.welcome.contact"
            components={{
              contactLink: (
                <Link
                  to={localizePath(CONTACT_SUPPORT_PATH)}
                  className="text-primary-600 hover:text-primary-700 dark:text-accent-400 dark:hover:text-accent-300 font-semibold underline underline-offset-4"
                />
              ),
            }}
          />
        </p>
      </div>
    </section>
  );
}

function ResourceRow({ link }: { link: NewMuslimLink }) {
  const { t } = useTranslation();
  const [thumbBroken, setThumbBroken] = useState(false);
  const Icon = ICONS[link.icon];

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card group flex items-center gap-4 px-4 py-3.5 sm:px-5"
    >
      <span className="ring-primary-500/10 text-primary-700 dark:ring-primary-700/60 dark:text-accent-300 inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1">
        {thumbBroken ? (
          <Icon size={20} aria-hidden="true" />
        ) : (
          <img
            src={link.image}
            alt=""
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            loading="lazy"
            decoding="async"
            onError={() => setThumbBroken(true)}
            className="h-full w-full object-cover"
          />
        )}
      </span>
      <span className="text-primary-700 group-hover:text-primary-600 dark:text-accent-300 min-w-0 flex-1 font-semibold">
        {link.title}
      </span>
      <ExternalLink
        size={16}
        aria-hidden="true"
        className="text-ink/40 group-hover:text-primary-600 dark:text-paper/40 dark:group-hover:text-accent-300 shrink-0 transition-colors"
      />
      <span className="sr-only">{t('newMuslimPage.links.opensNewTab')}</span>
    </a>
  );
}
