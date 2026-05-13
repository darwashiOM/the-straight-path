import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from './Container';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';
import type { FooterNavColumn } from '@/lib/content-schema';

export default function Footer() {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const year = new Date().getFullYear();
  const locale = 'en' as const;

  const footerNav = useSiteSetting('footerNav', locale);
  const columns = ((footerNav.data?.data?.columns as FooterNavColumn[] | undefined) ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <footer className="border-primary-500/10 dark:border-primary-700/30 dark:bg-primary-900 border-t bg-white py-12">
      <Container>
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link
              to={localizePath('/')}
              className="text-primary-700 dark:text-accent-300 font-serif text-lg font-semibold"
            >
              {t('site.name')}
            </Link>
            <p className="text-ink/70 dark:text-paper/70 mt-3 text-sm">{t('site.tagline')}</p>
          </div>
          {columns.map((col) => {
            const title = col.titleEn;
            return (
              <div key={col.id}>
                <h3 className="text-primary-700 dark:text-accent-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                  {title}
                </h3>
                <ul className="text-ink/70 dark:text-paper/70 space-y-2 text-sm">
                  {col.links.map((link, i) => {
                    const label = link.labelEn;
                    const key = `${col.id}-${link.to}-${i}`;
                    if (link.external) {
                      return (
                        <li key={key}>
                          <a
                            href={link.to}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary-700 dark:hover:text-accent-300"
                          >
                            {label}
                          </a>
                        </li>
                      );
                    }
                    return (
                      <li key={key}>
                        <Link
                          className="hover:text-primary-700 dark:hover:text-accent-300"
                          to={localizePath(link.to)}
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="border-primary-500/10 text-ink/60 dark:border-primary-700/30 dark:text-paper/60 mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs md:flex-row">
          <span>
            &copy; {year} {t('footer.copyright')}
          </span>
          <span className="flex items-center gap-4">
            <Link
              to={localizePath('/privacy')}
              className="hover:text-primary-700 dark:hover:text-accent-300"
            >
              {t('footer.privacy', { defaultValue: 'Privacy' }) as string}
            </Link>
            <Link
              to={localizePath('/terms')}
              className="hover:text-primary-700 dark:hover:text-accent-300"
            >
              {t('footer.terms', { defaultValue: 'Terms' }) as string}
            </Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
