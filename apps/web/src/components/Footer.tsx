import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from './Container';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';
import type { FooterNavColumn } from '@/lib/content-schema';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const year = new Date().getFullYear();
  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  const footerNav = useSiteSetting('footerNav', locale);
  const columns = (
    (footerNav.data?.data?.columns as FooterNavColumn[] | undefined) ?? []
  )
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <footer className="border-t border-primary-500/10 bg-white py-12 dark:border-primary-700/30 dark:bg-primary-900">
      <Container>
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link
              to={localizePath('/')}
              className="font-serif text-lg font-semibold text-primary-700 dark:text-accent-300"
            >
              {t('site.name')}
            </Link>
            <p className="mt-3 text-sm text-ink/70 dark:text-paper/70">{t('site.tagline')}</p>
          </div>
          {columns.map((col) => {
            const title = locale === 'ar' ? col.titleAr || col.titleEn : col.titleEn;
            return (
              <div key={col.id}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-accent-300">
                  {title}
                </h3>
                <ul className="space-y-2 text-sm text-ink/70 dark:text-paper/70">
                  {col.links.map((link, i) => {
                    const label =
                      locale === 'ar' ? link.labelAr || link.labelEn : link.labelEn;
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
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-primary-500/10 pt-6 text-xs text-ink/60 dark:border-primary-700/30 dark:text-paper/60 md:flex-row">
          <span>
            &copy; {year} {t('footer.copyright')}
          </span>
          <span className="flex items-center gap-3">
            <span>{t('footer.madeWith')}</span>
            {/* Intentionally tiny and unadvertised — a discoverable entry
                point for admins without hinting at it to general visitors. */}
            <Link
              to="/admin/login"
              className="text-ink/30 hover:text-ink/60 dark:text-paper/30 dark:hover:text-paper/60"
              aria-label={t('footerExtras.signIn', { defaultValue: 'Sign in' }) as string}
            >
              {t('footerExtras.signIn', { defaultValue: 'Sign in' }) as string}
            </Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
