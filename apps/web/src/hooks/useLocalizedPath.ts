import { useLocation } from 'react-router-dom';

import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n';

/**
 * Identity helpers kept around so existing callsites don't break. The app is
 * English-only — there is no locale prefix in URLs.
 */
export function useLocalizedPath() {
  const { pathname } = useLocation();
  const locale: Locale = DEFAULT_LOCALE;
  const localizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);
  const pathForLocale = (_locale: Locale) => pathname;
  return { locale, canonicalPath: pathname, localizePath, pathForLocale };
}
