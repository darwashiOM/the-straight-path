/**
 * Route manifest — single source of truth for every indexable page on The Straight Path.
 *
 * Page components import their SEO metadata from here via `getRouteMeta(path)`.
 * The sitemap generator (`scripts/generate-sitemap.mjs`) reads this file to produce
 * English + Arabic entries with hreflang alternates.
 *
 * Keep descriptions 140–160 characters, action-oriented, no keyword stuffing.
 */

export type ChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface RouteMeta {
  /** Path, without locale prefix, always starting with "/". */
  path: string;
  /** Page title fragment (will be suffixed with the site name). */
  title: string;
  /** Meta description, 140–160 chars. */
  description: string;
  /** Sitemap priority (0.0–1.0). */
  priority: number;
  /** Sitemap changefreq. */
  changefreq: ChangeFreq;
  /** If true, omit from sitemap and set robots to noindex. */
  noindex?: boolean;
  /** If true, the route has an Arabic equivalent at `/ar${path}`. */
  hasArabic?: boolean;
}

export const SITE_ORIGIN = 'https://thestraightpath.app';

/**
 * Canonical URL for a given route + locale.
 * English uses the bare path; Arabic is prefixed with `/ar`.
 */
export function canonicalFor(path: string, locale: 'en' | 'ar' = 'en'): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  if (locale === 'ar') return `${SITE_ORIGIN}/ar${clean || ''}` + (path === '/' ? '/' : '');
  return `${SITE_ORIGIN}${clean || ''}` + (path === '/' ? '/' : '');
}

export const routes: RouteMeta[] = [
  {
    path: '/',
    title: 'A Clear Path to God',
    description:
      'A pastoral, accessible introduction to Islam. Learn the essentials, read the Qur’an, and explore a clear path to God — written for seekers of any background.',
    priority: 1.0,
    changefreq: 'weekly',
    hasArabic: true,
  },
  {
    path: '/learn',
    title: 'Learn About Islam',
    description:
      'A curated set of essays introducing the core beliefs, character, and practices of Islam — written in plain, reader-first language for seekers of any background.',
    priority: 0.9,
    changefreq: 'weekly',
    hasArabic: true,
  },
  {
    path: '/learn/articles',
    title: 'Articles',
    description:
      'Browse every essay on The Straight Path — reflections on the creed, the Prophet Muḥammad ﷺ, the Qur’an, character, and the path of sincere submission to God.',
    priority: 0.9,
    changefreq: 'weekly',
    hasArabic: true,
  },
  {
    path: '/quran',
    title: 'Read the Qur’an',
    description:
      'Read the Qur’an — the word of God, preserved word-for-word for over 1,400 years. We point to Quran.com for a trusted, free, multilingual reading experience.',
    priority: 0.8,
    changefreq: 'monthly',
    hasArabic: true,
  },
  {
    path: '/faq',
    title: 'Frequently Asked Questions',
    description:
      'Plain, honest answers to common questions about Islam — what Muslims believe, how to become Muslim, the five pillars, and where to ask anything else.',
    priority: 0.8,
    changefreq: 'monthly',
    hasArabic: true,
  },
  {
    path: '/resources',
    title: 'Useful External Links',
    description:
      'Trusted external sites for further study of the Qur’an, hadith, and Islamic thought — hand-picked for accuracy, accessibility, and a reader-first tone.',
    priority: 0.6,
    changefreq: 'monthly',
    hasArabic: true,
  },
  {
    path: '/social',
    title: 'Islam Explained on Social Media',
    description:
      'A small, curated list of video channels that explain Islam with clarity and good character — short reminders, long dialogues, and research-driven explainers.',
    priority: 0.6,
    changefreq: 'monthly',
    hasArabic: true,
  },
  {
    path: '/about',
    title: 'About',
    description:
      'About The Straight Path — an independent, volunteer effort to share Islam in a calm, pastoral voice. Read our principles, our method, and how we are funded.',
    priority: 0.5,
    changefreq: 'yearly',
    hasArabic: true,
  },
  {
    path: '/contact',
    title: 'Contact',
    description:
      'Have a question about Islam, a correction, or a thought? Send us a message — we read every one and reply with care. No pressure, just conversation.',
    priority: 0.5,
    changefreq: 'yearly',
    hasArabic: true,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description:
      'How The Straight Path handles personal data — what we collect, what we do not, how long we retain messages, and how to request deletion.',
    priority: 0.2,
    changefreq: 'yearly',
    hasArabic: false,
  },
  {
    path: '/terms',
    title: 'Terms of Use',
    description:
      'The terms governing use of The Straight Path — good-faith content, MIT-licensed code, CC BY 4.0 original text, and basic expectations of respectful use.',
    priority: 0.2,
    changefreq: 'yearly',
    hasArabic: false,
  },
];

export function getRouteMeta(path: string): RouteMeta | undefined {
  return routes.find((r) => r.path === path);
}

/** The article detail template — cloned per slug at build time by the sitemap generator. */
export const ARTICLE_ROUTE_TEMPLATE = {
  basePath: '/learn/articles',
  priority: 0.8,
  changefreq: 'monthly' as ChangeFreq,
};
