/**
 * Typed JSON-LD schema helpers for The Straight Path.
 *
 * Every page that has meaningful, indexable content should emit one or more of
 * these via `<SeoHead jsonLd={...} />`. The helpers return plain JSON-serializable
 * objects; SeoHead handles stringification.
 *
 * Schemas follow schema.org vocabulary and Google's Rich Results guidance.
 */

import { SITE_ORIGIN } from '@/lib/routes';

const SITE_NAME = 'The Straight Path';
const DEFAULT_LOGO = `${SITE_ORIGIN}/logo.png`;
const DEFAULT_DESCRIPTION =
  'A pastoral, accessible introduction to Islam. Learn the essentials, read the Qur’an, and explore a clear path to God.';

/**
 * Public social / profile URLs for the Organization `sameAs`. Empty for now —
 * populate as accounts come online. Keeping the field typed makes it easy to
 * extend later without a schema change.
 */
export const SOCIAL_PROFILES: readonly string[] = [];

export type JsonLd = Record<string, unknown>;

export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: {
      '@type': 'ImageObject',
      url: DEFAULT_LOGO,
    },
    description: DEFAULT_DESCRIPTION,
    sameAs: [...SOCIAL_PROFILES],
  };
}

export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    alternateName: 'TSP',
    url: SITE_ORIGIN,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en',
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  };
}

export interface ArticleSchemaInput {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  heroImage?: string;
  tags?: string[];
}

export function articleSchema(article: ArticleSchemaInput): JsonLd {
  const url = `${SITE_ORIGIN}/learn/articles/${article.slug}`;
  const image = article.heroImage
    ? article.heroImage.startsWith('http')
      ? article.heroImage
      : `${SITE_ORIGIN}${article.heroImage}`
    : `${SITE_ORIGIN}/og-default.png`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: 'en',
    keywords: article.tags?.join(', '),
    image,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: article.author, url: SITE_ORIGIN },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: DEFAULT_LOGO },
    },
  };
}

export interface BreadcrumbCrumb {
  name: string;
  url: string;
}

export function breadcrumbSchema(trail: BreadcrumbCrumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqSchema(faqs: readonly FaqItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * Combine multiple schemas into a single `@graph` payload. Emit one JSON-LD
 * script tag per page containing every relevant schema.
 */
export function graph(...nodes: JsonLd[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map((n) => {
      // Strip the duplicated @context from nested nodes.
      const copy: JsonLd = { ...n };
      delete copy['@context'];
      return copy;
    }),
  };
}
