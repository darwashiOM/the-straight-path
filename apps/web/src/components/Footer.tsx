import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from './Container';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

export default function Footer() {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const year = new Date().getFullYear();

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
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-accent-300">
              {t('footer.learn')}
            </h3>
            <ul className="space-y-2 text-sm text-ink/70 dark:text-paper/70">
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/learn')}
                >
                  {t('nav.learn')}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/learn/articles')}
                >
                  {t('nav.articles')}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/quran')}
                >
                  {t('nav.quran')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-accent-300">
              {t('footer.community')}
            </h3>
            <ul className="space-y-2 text-sm text-ink/70 dark:text-paper/70">
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/resources')}
                >
                  {t('nav.resources')}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/faq')}
                >
                  {t('nav.faq')}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/social')}
                >
                  {t('nav.social')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-accent-300">
              {t('footer.project')}
            </h3>
            <ul className="space-y-2 text-sm text-ink/70 dark:text-paper/70">
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/about')}
                >
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/contact')}
                >
                  {t('nav.contact')}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/privacy')}
                >
                  {t('nav.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-primary-700 dark:hover:text-accent-300"
                  to={localizePath('/terms')}
                >
                  {t('nav.terms')}
                </Link>
              </li>
            </ul>
          </div>
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
