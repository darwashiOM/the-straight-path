import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Container from './Container';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';

const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

export default function Footer() {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const year = new Date().getFullYear();
  const locale = 'en' as const;

  const footerCopy = useSiteSetting<{ copyright?: string }>('footer', locale);
  // The line continues with " · CC BY 4.0", so a closing period is dropped.
  const copyright = (footerCopy.data?.value.copyright ?? (t('footer.copyright') as string))
    .trim()
    .replace(/\.$/, '');
  const linkCls = 'hover:text-primary-700 dark:hover:text-accent-300';

  return (
    <footer className="border-primary-500/10 dark:border-primary-700/30 dark:bg-primary-900 border-t bg-white py-8">
      <Container>
        <div className="text-ink/60 dark:text-paper/60 flex flex-col items-center justify-between gap-3 text-xs md:flex-row">
          <span>
            &copy; {year} {copyright} &middot;{' '}
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="license noopener noreferrer"
              className={linkCls}
            >
              {t('footer.license')}
            </a>
          </span>
          <span className="flex items-center gap-4">
            <Link to={localizePath('/privacy')} className={linkCls}>
              {t('footer.privacy', { defaultValue: 'Privacy' }) as string}
            </Link>
            <Link to={localizePath('/terms')} className={linkCls}>
              {t('footer.terms', { defaultValue: 'Terms' }) as string}
            </Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
