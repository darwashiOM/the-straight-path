import { Helmet } from 'react-helmet-async';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import type { Locale } from '@/lib/i18n';
import { SITE_ORIGIN, canonicalFor } from '@/lib/routes';

interface SeoHeadProps {
  /** Page-level title fragment; gets suffixed with the site name. */
  title?: string;
  /** Meta description, 140-160 chars. */
  description?: string;
  /**
   * Absolute canonical URL. If omitted, derived from the current route +
   * active locale via `canonicalFor`. Passing this explicitly is only needed
   * for edge cases, such as article pages computing a slug-specific URL.
   */
  canonical?: string;
  /** Absolute URL to the Open Graph image. Defaults to the site OG. */
  ogImage?: string;
  /** OpenGraph type. */
  type?: 'website' | 'article';
  /**
   * Locale of the current page. When omitted, derived from the URL via
   * `useLocalizedPath`; the URL is the source of truth.
   */
  locale?: Locale;
  /**
   * Path without locale prefix used to emit alternate hreflang links. When
   * omitted, derived from the current pathname.
   */
  alternatePath?: string;
  /** If true, emits robots noindex. */
  noindex?: boolean;
  /** Optional JSON-LD payload. Can be a single schema or an @graph object. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'The Straight Path';
const DEFAULT_TAGLINE_EN = 'A Clear Path to God';
const DEFAULT_DESCRIPTION_EN =
  'A pastoral, accessible introduction to Islam. Learn the essentials, read the Quran, and explore a clear path to God.';
const DEFAULT_OG = `${SITE_ORIGIN}/og-default.png`;

function absoluteOg(url?: string): string {
  if (!url) return DEFAULT_OG;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function cleanMeta(value: string | undefined, fallback: string): string {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

export default function SeoHead({
  title,
  description,
  canonical,
  ogImage,
  type = 'website',
  locale: localeProp,
  alternatePath,
  noindex = false,
  jsonLd,
}: SeoHeadProps) {
  const { locale: urlLocale, canonicalPath } = useLocalizedPath();
  const locale: Locale = localeProp ?? urlLocale;
  const localeCode = String(locale);
  const resolvedPath = alternatePath ?? canonicalPath ?? '/';

  const siteName = SITE_NAME;
  const tagline = DEFAULT_TAGLINE_EN;
  const resolvedTitle = cleanMeta(title, '');
  const resolvedDescription = cleanMeta(description, DEFAULT_DESCRIPTION_EN);
  const fullTitle = resolvedTitle ? `${resolvedTitle} — ${siteName}` : `${siteName} — ${tagline}`;

  const canonicalUrl = canonical ?? canonicalFor(resolvedPath, locale);
  const enUrl = canonicalFor(resolvedPath, 'en');
  const localeUrl = canonicalFor(resolvedPath, locale);
  const ogImageUrl = absoluteOg(ogImage);
  const ogLocale = localeCode === 'ar' ? 'ar' : 'en_US';

  const schemas = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang={localeCode} dir={localeCode === 'ar' ? 'rtl' : 'ltr'} />

      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />

      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      {localeCode !== 'en' ? (
        <link rel="alternate" hrefLang={localeCode} href={localeUrl} />
      ) : null}
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:url" content={canonicalUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={ogImageUrl} />

      {schemas.map((schema, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}import { Helmet } from 'react-helmet-async';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import type { Locale } from '@/lib/i18n';
import { SITE_ORIGIN, canonicalFor } from '@/lib/routes';

interface SeoHeadProps {
  /** Page-level title fragment; gets suffixed with the site name. */
  title?: string;
  /** Meta description, 140-160 chars. */
  description?: string;
  /**
   * Absolute canonical URL. If omitted, derived from the current route +
   * active locale via `canonicalFor`. Passing this explicitly is only needed
   * for edge cases, such as article pages computing a slug-specific URL.
   */
  canonical?: string;
  /** Absolute URL to the Open Graph image. Defaults to the site OG. */
  ogImage?: string;
  /** OpenGraph type. */
  type?: 'website' | 'article';
  /**
   * Locale of the current page. When omitted, derived from the URL via
   * `useLocalizedPath`; the URL is the source of truth.
   */
  locale?: Locale;
  /**
   * Path without locale prefix used to emit alternate hreflang links. When
   * omitted, derived from the current pathname.
   */
  alternatePath?: string;
  /** If true, emits robots noindex. */
  noindex?: boolean;
  /** Optional JSON-LD payload. Can be a single schema or an @graph object. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'The Straight Path';
const DEFAULT_TAGLINE_EN = 'A Clear Path to God';
const DEFAULT_DESCRIPTION_EN =
  'A pastoral, accessible introduction to Islam. Learn the essentials, read the Quran, and explore a clear path to God.';
const DEFAULT_OG = `${SITE_ORIGIN}/og-default.png`;

function absoluteOg(url?: string): string {
  if (!url) return DEFAULT_OG;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function cleanMeta(value: string | undefined, fallback: string): string {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

export default function SeoHead({
  title,
  description,
  canonical,
  ogImage,
  type = 'website',
  locale: localeProp,
  alternatePath,
  noindex = false,
  jsonLd,
}: SeoHeadProps) {
  const { locale: urlLocale, canonicalPath } = useLocalizedPath();
  const locale: Locale = localeProp ?? urlLocale;
  const localeCode = String(locale);
  const resolvedPath = alternatePath ?? canonicalPath ?? '/';

  const siteName = SITE_NAME;
  const tagline = DEFAULT_TAGLINE_EN;
  const resolvedTitle = cleanMeta(title, '');
  const resolvedDescription = cleanMeta(description, DEFAULT_DESCRIPTION_EN);
  const fullTitle = resolvedTitle ? `${resolvedTitle} — ${siteName}` : `${siteName} — ${tagline}`;

  const canonicalUrl = canonical ?? canonicalFor(resolvedPath, locale);
  const enUrl = canonicalFor(resolvedPath, 'en');
  const localeUrl = canonicalFor(resolvedPath, locale);
  const ogImageUrl = absoluteOg(ogImage);
  const ogLocale = localeCode === 'ar' ? 'ar' : 'en_US';

  const schemas = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang={localeCode} dir={localeCode === 'ar' ? 'rtl' : 'ltr'} />

      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />

      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      {localeCode !== 'en' ? (
        <link rel="alternate" hrefLang={localeCode} href={localeUrl} />
      ) : null}
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:url" content={canonicalUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={ogImageUrl} />

      {schemas.map((schema, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
