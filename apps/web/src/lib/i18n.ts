import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';

export const SUPPORTED_LOCALES = ['en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Always English — kept as a function so consumers don't break. */
export function localeFromPath(_pathname: string): Locale {
  return 'en';
}

/** Identity — no locale prefixes in URLs anymore. */
export function stripLocalePrefix(pathname: string): string {
  return pathname || '/';
}

/** Identity — no locale prefixes in URLs anymore. */
export function withLocalePrefix(path: string, _locale: Locale): string {
  return path.startsWith('/') ? path : `/${path}`;
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES as unknown as string[],
  interpolation: { escapeValue: false },
  returnObjects: true,
});

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('dir', 'ltr');
  document.documentElement.setAttribute('lang', 'en');
}

export default i18n;
