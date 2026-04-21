import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ar from '@/locales/ar.json';

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Derive the locale from a pathname. Paths prefixed with `/ar` (or `/ar/...`)
 * are Arabic; everything else is English. We intentionally avoid
 * language-detector magic: the URL is the single source of truth so that
 * hreflang, SSR/prerender, and sharing all line up.
 */
export function localeFromPath(pathname: string): Locale {
  if (pathname === '/ar' || pathname.startsWith('/ar/')) return 'ar';
  return 'en';
}

/**
 * Strip the locale prefix from a pathname, returning a canonical path that
 * works in either locale (always starts with `/`).
 */
export function stripLocalePrefix(pathname: string): string {
  if (pathname === '/ar') return '/';
  if (pathname.startsWith('/ar/')) return pathname.slice(3) || '/';
  return pathname || '/';
}

/**
 * Prepend the locale prefix to a canonical (prefix-free) path.
 */
export function withLocalePrefix(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'en') return clean;
  if (clean === '/') return '/ar';
  return `/ar${clean}`;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: typeof window !== 'undefined' ? localeFromPath(window.location.pathname) : DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES as unknown as string[],
  interpolation: { escapeValue: false },
  returnObjects: true,
});

function applyDocumentLocale(lng: string) {
  if (typeof document === 'undefined') return;
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
}

// Apply on boot and on every future language change.
applyDocumentLocale(i18n.language || DEFAULT_LOCALE);
i18n.on('languageChanged', applyDocumentLocale);

export default i18n;
