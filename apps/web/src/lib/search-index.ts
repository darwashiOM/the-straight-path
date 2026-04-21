/**
 * Search index — builds a Fuse.js index of every indexable entity on the
 * site (articles, FAQ items, resources, social channels) at call time.
 *
 * Because Fuse is ~12 KB gzipped, this module is only imported by the
 * <SearchDialog>, which is itself lazy-loaded. That keeps the first-paint
 * bundle free of search code.
 *
 * Content is fetched directly from Firestore when the dialog opens, so the
 * index reflects the live admin state. If Firestore is empty or unreachable
 * we fall back to the built-in defaults from `content-defaults`.
 */
import Fuse from 'fuse.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { getDb } from './firebase';
import { pickLocale, type ArticleDoc, type Locale } from './content-schema';
import {
  DEFAULT_CHANNELS,
  DEFAULT_FAQS,
  DEFAULT_RESOURCES,
} from './content-defaults';

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

function snippet(markdown: string, max = 400): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

async function fetchPublishedArticles(locale: Locale) {
  try {
    const snap = await getDocs(
      query(collection(getDb(), 'articles'), where('status', '==', 'published')),
    );
    return snap.docs.map((d) => {
      const data = d.data() as ArticleDoc;
      const tr = pickLocale(data.translations, locale);
      return {
        slug: data.slug,
        title: tr.title,
        excerpt: tr.excerpt,
        body: tr.body,
      };
    });
  } catch {
    return [];
  }
}

async function fetchFaqs(locale: Locale) {
  try {
    const snap = await getDocs(collection(getDb(), 'faqs'));
    if (snap.empty) {
      return DEFAULT_FAQS.map((f, i) => {
        const tr = pickLocale(f.translations, locale);
        return { id: f.id ?? String(i), question: tr.question, answer: tr.answer };
      });
    }
    return snap.docs.map((d) => {
      const data = d.data() as {
        translations: { en: { question: string; answer: string }; ar?: { question: string; answer: string } };
      };
      const tr = pickLocale(data.translations, locale);
      return { id: d.id, question: tr.question, answer: tr.answer };
    });
  } catch {
    return DEFAULT_FAQS.map((f, i) => {
      const tr = pickLocale(f.translations, locale);
      return { id: f.id ?? String(i), question: tr.question, answer: tr.answer };
    });
  }
}

async function fetchResources(locale: Locale) {
  try {
    const snap = await getDocs(collection(getDb(), 'resources'));
    if (snap.empty) {
      return DEFAULT_RESOURCES.map((r) => {
        const tr = pickLocale(r.translations, locale);
        return { id: r.id, title: tr.title, description: tr.description, url: r.url };
      });
    }
    return snap.docs.map((d) => {
      const data = d.data() as {
        url: string;
        translations: { en: { title: string; description: string }; ar?: { title: string; description: string } };
      };
      const tr = pickLocale(data.translations, locale);
      return { id: d.id, title: tr.title, description: tr.description, url: data.url };
    });
  } catch {
    return DEFAULT_RESOURCES.map((r) => {
      const tr = pickLocale(r.translations, locale);
      return { id: r.id, title: tr.title, description: tr.description, url: r.url };
    });
  }
}

async function fetchChannels(locale: Locale) {
  try {
    const snap = await getDocs(collection(getDb(), 'channels'));
    if (snap.empty) {
      return DEFAULT_CHANNELS.map((c) => {
        const tr = pickLocale(c.translations, locale);
        return { id: c.id, name: tr.name, description: tr.description, url: c.url };
      });
    }
    return snap.docs.map((d) => {
      const data = d.data() as {
        url: string;
        translations: { en: { name: string; description: string }; ar?: { name: string; description: string } };
      };
      const tr = pickLocale(data.translations, locale);
      return { id: d.id, name: tr.name, description: tr.description, url: data.url };
    });
  } catch {
    return DEFAULT_CHANNELS.map((c) => {
      const tr = pickLocale(c.translations, locale);
      return { id: c.id, name: tr.name, description: tr.description, url: c.url };
    });
  }
}

/**
 * Build the full list of SearchItems for the active locale by reading
 * Firestore directly. The search dialog awaits this on first open and
 * memoizes by locale.
 */
export async function buildSearchItemsAsync(locale: Locale): Promise<SearchItem[]> {
  const [articles, faqs, resources, channels] = await Promise.all([
    fetchPublishedArticles(locale),
    fetchFaqs(locale),
    fetchResources(locale),
    fetchChannels(locale),
  ]);

  const items: SearchItem[] = [];

  for (const a of articles) {
    items.push({
      id: `article:${a.slug}`,
      type: 'article',
      title: a.title,
      body: `${a.excerpt} ${snippet(a.body)}`.trim(),
      to: `/learn/articles/${a.slug}`,
    });
  }

  faqs.forEach((f) => {
    items.push({
      id: `faq:${f.id}`,
      type: 'faq',
      title: f.question,
      body: f.answer,
      to: `/faq`,
    });
  });

  for (const r of resources) {
    items.push({
      id: `resource:${r.id}`,
      type: 'resource',
      title: r.title,
      body: r.description,
      to: `/resources`,
      externalUrl: r.url,
    });
  }

  for (const c of channels) {
    items.push({
      id: `social:${c.id}`,
      type: 'social',
      title: c.name,
      body: c.description,
      to: `/social`,
      externalUrl: c.url,
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
