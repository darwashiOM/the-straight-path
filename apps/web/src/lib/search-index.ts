/**
 * Search index — builds a Fuse.js index of every indexable entity on the
 * site (articles, FAQ items, resources, social channels) at module load.
 *
 * Because Fuse is ~12 KB gzipped, this module is only imported by the
 * <SearchDialog>, which is itself lazy-loaded. That keeps the first-paint
 * bundle free of search code.
 *
 * Raw MDX sources are loaded with Vite's `?raw` glob so we can index a short
 * body snippet in addition to frontmatter excerpts.
 */
import Fuse from 'fuse.js';
import type { TFunction } from 'i18next';

import { articles } from '@/content/articles';

export type SearchItemType = 'article' | 'faq' | 'resource' | 'social';

export interface SearchItem {
  id: string;
  type: SearchItemType;
  title: string;
  body: string;
  /** Path to navigate to (canonical, locale-free). */
  to: string;
  /** If set, the item links out to an external URL instead of `to`. */
  externalUrl?: string;
}

/** Raw MDX content for each article, keyed by filename. */
const RAW_MDX = import.meta.glob<string>('../content/articles/*.mdx', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** Strip frontmatter, markdown syntax, and HTML, collapse whitespace. */
function stripMdx(raw: string): string {
  // Remove frontmatter block.
  const withoutFm = raw.replace(/^---[\s\S]*?---\n?/, '');
  return withoutFm
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1') // links -> text
    .replace(/<[^>]+>/g, ' ') // JSX/HTML
    .replace(/[#>*_~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bodySnippetFor(slug: string): string {
  // Keys look like `../content/articles/<slug>.mdx`.
  const entry = Object.entries(RAW_MDX).find(([k]) => k.endsWith(`/${slug}.mdx`));
  if (!entry) return '';
  return stripMdx(entry[1]).slice(0, 500);
}

interface FaqEntry {
  q: string;
  a: string;
}

interface ResourceEntry {
  key: string;
  title: string;
  description: string;
  url: string;
  category?: string;
}

interface SocialChannelEntry {
  key: string;
  name: string;
  description: string;
  url: string;
}

const RESOURCES: Omit<ResourceEntry, 'title' | 'description'>[] = [
  { key: 'quranCom', url: 'https://quran.com/', category: 'quran' },
  { key: 'sunnahCom', url: 'https://sunnah.com/', category: 'hadith' },
  { key: 'yaqeen', url: 'https://yaqeeninstitute.org/', category: 'research' },
  { key: 'bayyinah', url: 'https://bayyinah.tv/', category: 'study' },
  { key: 'islamicAwareness', url: 'https://www.islamic-awareness.org/', category: 'research' },
];

const SOCIAL_CHANNELS: Omit<SocialChannelEntry, 'name' | 'description'>[] = [
  { key: 'efdawah', url: 'https://www.youtube.com/@EFDawah' },
  { key: 'yaqeen', url: 'https://www.youtube.com/@YaqeenInstituteOfficial' },
  { key: 'muftiMenk', url: 'https://www.youtube.com/@muftimenkofficial' },
];

/**
 * Build the full list of SearchItems for the active locale. The i18n
 * `t` function is passed in so the caller can decide which locale to index
 * (we typically pass the current one).
 */
export function buildSearchItems(t: TFunction, i18n: { exists: (k: string) => boolean }): SearchItem[] {
  const items: SearchItem[] = [];

  // Articles.
  for (const a of articles) {
    if (a.frontmatter.draft) continue;
    const slug = a.frontmatter.slug;
    const title =
      i18n.exists(`articles.${slug}.title`)
        ? (t(`articles.${slug}.title`) as string)
        : a.frontmatter.title;
    const excerpt =
      i18n.exists(`articles.${slug}.excerpt`)
        ? (t(`articles.${slug}.excerpt`) as string)
        : a.frontmatter.excerpt;
    const snippet = bodySnippetFor(slug);
    items.push({
      id: `article:${slug}`,
      type: 'article',
      title,
      body: `${excerpt} ${snippet}`.trim(),
      to: `/learn/articles/${slug}`,
    });
  }

  // FAQ.
  const faqs = (t('faqPage.items', { returnObjects: true }) as FaqEntry[] | undefined) ?? [];
  faqs.forEach((f, i) => {
    items.push({
      id: `faq:${i}`,
      type: 'faq',
      title: f.q,
      body: f.a,
      to: `/faq`,
    });
  });

  // Resources.
  for (const r of RESOURCES) {
    items.push({
      id: `resource:${r.key}`,
      type: 'resource',
      title: t(`resourcesPage.items.${r.key}.title`) as string,
      body: t(`resourcesPage.items.${r.key}.description`) as string,
      to: `/resources`,
      externalUrl: r.url,
    });
  }

  // Social channels.
  for (const s of SOCIAL_CHANNELS) {
    items.push({
      id: `social:${s.key}`,
      type: 'social',
      title: t(`socialPage.channels.${s.key}.name`) as string,
      body: t(`socialPage.channels.${s.key}.description`) as string,
      to: `/social`,
      externalUrl: s.url,
    });
  }

  return items;
}

/**
 * Construct a Fuse index with settings tuned for short titles and body
 * snippets. `includeMatches` lets the UI highlight the matching range.
 */
export function createFuse(items: SearchItem[]): Fuse<SearchItem> {
  return new Fuse(items, {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'body', weight: 0.3 },
    ],
    includeMatches: true,
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

export type FuseResult = ReturnType<ReturnType<typeof createFuse>['search']>[number];
