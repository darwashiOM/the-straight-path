import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  DEFAULT_LOCALE,
  localeFromPath,
  stripLocalePrefix,
  withLocalePrefix,
  type Locale,
} from '@/lib/i18n';

/**
 * `useLocalizedPath` — the router/locale glue used everywhere we build a link.
 *
 * Returns:
 *  - `locale` — the active locale derived from the URL (not localStorage).
 *  - `localizePath(path)` — prefix a canonical app path (e.g. `/learn`) with
 *    the current locale (`/learn` or `/ar/learn`).
 *  - `pathForLocale(locale)` — return the current page's equivalent URL in
 *    the given locale (used by <LanguageSwitcher> and hreflang).
 *  - `canonicalPath` — the current pathname with any `/ar` prefix stripped.
 */
export function useLocalizedPath() {
  const { i18n } = useTranslation();
  const { pathname, search, hash } = useLocation();

  const urlLocale = localeFromPath(pathname);
  // Prefer the URL-derived locale — it is the single source of truth — but
  // fall back to i18n.language for safety in edge cases (e.g. SSR).
  const locale: Locale = (urlLocale || (i18n.language as Locale) || DEFAULT_LOCALE) as Locale;

  const canonicalPath = stripLocalePrefix(pathname);

  const localizePath = useCallback(
    (path: string) => withLocalePrefix(path, locale),
    [locale],
  );

  const pathForLocale = useCallback(
    (target: Locale) => `${withLocalePrefix(canonicalPath, target)}${search}${hash}`,
    [canonicalPath, search, hash],
  );

  return { locale, canonicalPath, localizePath, pathForLocale };
}
