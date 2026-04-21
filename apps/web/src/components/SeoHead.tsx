import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
}

const SITE_NAME = 'The Straight Path';
const DEFAULT_DESCRIPTION =
  'A pastoral, accessible introduction to Islam. Learn the essentials, read the Qur’an, and explore a clear path to God.';

export default function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = 'https://thestraightpath.app/og-default.png',
  type = 'website',
  jsonLd,
}: SeoHeadProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — A Clear Path to God`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical ? <link rel="canonical" href={canonical} /> : null}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
