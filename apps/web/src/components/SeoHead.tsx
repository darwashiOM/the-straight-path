import { Helmet } from 'react-helmet-async';

import { SITE_ORIGIN, canonicalFor } from '@/lib/routes';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import type { Locale } from '@/lib/i18n';

interface SeoHeadProps {
  /** Page-level title fragment; gets suffixed with the site name. */
  title?: string;
  /** Meta description, 140–160 chars. */
  description?: string;
  /**
   * Absolute canonical URL. If omitted, derived from the current route +
   * active locale via `canonicalFor`. Passing this explicitly is only needed
   * for edge cases (e.g. article pages computing a slug-specific URL).
   */
  canonical?: string;
  /** Absolute URL to the Open Graph image. Defaults to the site OG. */
  ogImage?: string;
  /** OpenGraph type. */
  type?: 'website' | 'article';
  /**
   * Locale of the current page. When omitted, derived from the URL via
   * `useLocalizedPath` — the URL is the source of truth.
   */
  locale?: Locale;
  /**
   * Path (without locale prefix) used to emit `<link rel="alternate" hreflang>`
   * pairs for every supported locale. When omitted, derived from the current
   * pathname. Pass explicitly only when the current URL isn't the canonical
   * path (e.g. dynamic article pages before the slug resolves).
   */
  alternatePath?: string;
  /** If true, emits robots noindex. */
  noindex?: boolean;
  /** Optional JSON-LD payload. Can be a single schema or an @graph object. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = 'The Straight Path';
const SITE_NAME_AR = 'الطريق المستقيم';
const DEFAULT_TAGLINE_EN = 'A Clear Path to God';
const DEFAULT_TAGLINE_AR = 'طريق واضح إلى الله';
const DEFAULT_DESCRIPTION_EN =
  'A pastoral, accessible introduction to Islam. Learn the essentials, read the Qur’an, and explore a clear path to God.';
const DEFAULT_DESCRIPTION_AR =
  'مقدمة هادئة ورحيمة عن الإسلام. تعلّم الأساسيات، واقرأ القرآن، واستكشف طريقاً واضحاً إلى الله.';
const DEFAULT_OG = `${SITE_ORIGIN}/og-default.png`;

function absoluteOg(url: string): string {
  if (!url) return DEFAULT_OG;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function SeoHead({
  title,
  description,
  canonical,
  ogImage,
  type = 'website',
  locale: localeProp,
  alternatePath,
  noindex,
  jsonLd,
}: SeoHeadProps) {
  const { locale: urlLocale, canonicalPath } = useLocalizedPath();
  const locale: Locale = localeProp ?? urlLocale;
  const resolvedPath = alternatePath ?? canonicalPath ?? '/';
  const siteName = locale === 'ar' ? SITE_NAME_AR : SITE_NAME;
  const tagline = locale === 'ar' ? DEFAULT_TAGLINE_AR : DEFAULT_TAGLINE_EN;
  const resolvedDescription =
    description ?? (locale === 'ar' ? DEFAULT_DESCRIPTION_AR : DEFAULT_DESCRIPTION_EN);
  const fullTitle = title ? `${title} — ${siteName}` : `${siteName} — ${tagline}`;
  const ogImageUrl = absoluteOg(ogImage ?? DEFAULT_OG);
  const ogLocale = locale === 'ar' ? 'ar_SA' : 'en_US';
  const altLocale = locale === 'ar' ? 'en_US' : 'ar_SA';

  const canonicalUrl = canonical ?? canonicalFor(resolvedPath, locale);
  const enUrl = canonicalFor(resolvedPath, 'en');
  const arUrl = canonicalFor(resolvedPath, 'ar');

  const schemas = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} />
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : null}
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="ar" href={arUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:locale:alternate" content={altLocale} />
      <meta property="og:url" content={canonicalUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={ogImageUrl} />

      {schemas.map((s, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
