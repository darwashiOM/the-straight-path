/**
 * Search index — plain word search over every indexable entity on the site
 * (articles, FAQ items, resources, social channels).
 *
 * Every word typed must start a word somewhere in the title or the text
 * ("pray" finds "prayer", not "spray"). Case, diacritics, and apostrophes
 * are ignored, so "quran" finds "Qur'ān". Articles are searched in full.
 *
 * This module is only imported by the lazy-loaded <SearchDialog>, which
 * keeps search code out of the first-paint bundle.
 *
 * Content is fetched directly from Firestore when the dialog opens, so the
 * index reflects the live admin state. If Firestore is empty or unreachable
 * we fall back to the built-in defaults from `content-defaults`.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';

import { getDb } from './firebase';
import { pickLocale, type ArticleDoc, type Locale } from './content-schema';
import { DEFAULT_CHANNELS, DEFAULT_FAQS, DEFAULT_RESOURCES } from './content-defaults';

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

/** Markdown to plain text for searching and snippets. */
function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
        translations: {
          en: { question: string; answer: string };
          ar?: { question: string; answer: string };
        };
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
        translations: {
          en: { title: string; description: string };
          ar?: { title: string; description: string };
        };
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
        translations: {
          en: { name: string; description: string };
          ar?: { name: string; description: string };
        };
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
      body: `${a.excerpt} ${plainText(a.body)}`.trim(),
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

/** A highlighted span: start inclusive, end exclusive, in the original text. */
export type Range = readonly [start: number, end: number];

export interface SearchHit {
  item: SearchItem;
  score: number;
  titleRanges: Range[];
  /** A piece of the text around the first match (the opening if none). */
  snippet: string;
  snippetRanges: Range[];
}

export interface SearchIndex {
  search(query: string, limit?: number): SearchHit[];
}

/** Lowercased text without diacritics or apostrophes, plus a map from each
 *  folded character back to its index in the original string. */
interface Folded {
  text: string;
  map: number[];
}

const DROPPED = /['’‘ʿʾʻ`]/;
const WORD_CHAR = /[\p{L}\p{N}]/u;

function fold(source: string): Folded {
  let text = '';
  const map: number[] = [];
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    if (DROPPED.test(ch)) continue;
    const base = ch
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    for (const b of base) {
      text += b;
      map.push(i);
    }
  }
  return { text, map };
}

function queryTerms(query: string): string[] {
  const terms = fold(query)
    .text.split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return [...new Set(terms)];
}

/** Original-text ranges where `term` starts a word. */
function wordStarts(f: Folded, term: string): Range[] {
  const out: Range[] = [];
  let at = f.text.indexOf(term);
  while (at !== -1) {
    const prev = at > 0 ? f.text[at - 1]! : '';
    if (!prev || !WORD_CHAR.test(prev)) {
      out.push([f.map[at]!, f.map[at + term.length - 1]! + 1]);
    }
    at = f.text.indexOf(term, at + 1);
  }
  return out;
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

const SNIPPET_BEFORE = 60;
const SNIPPET_LENGTH = 240;

/** Cut a window of `body` around its first match and shift the ranges. */
function makeSnippet(body: string, ranges: Range[]): { snippet: string; ranges: Range[] } {
  const first = ranges[0];
  let start = 0;
  if (first && first[0] > SNIPPET_BEFORE) {
    start = first[0] - SNIPPET_BEFORE;
    const space = body.indexOf(' ', start);
    if (space !== -1 && space < first[0]) start = space + 1;
  }
  const end = Math.min(body.length, start + SNIPPET_LENGTH);
  const lead = start > 0 ? '… ' : '';
  const tail = end < body.length ? ' …' : '';
  const shifted = ranges
    .filter(([s, e]) => s >= start && e <= end)
    .map(([s, e]) => [s - start + lead.length, e - start + lead.length] as const);
  return { snippet: lead + body.slice(start, end) + tail, ranges: shifted };
}

/**
 * Build the search index. Every query word has to appear (as the start of a
 * word) in the title or the text; title matches rank first.
 */
export function createSearchIndex(items: SearchItem[]): SearchIndex {
  const entries = items.map((item) => ({
    item,
    title: fold(item.title),
    body: fold(item.body),
  }));

  return {
    search(query, limit = 40) {
      const terms = queryTerms(query);
      if (terms.length === 0) return [];
      const phrase = terms.join(' ');
      const hits: SearchHit[] = [];

      for (const entry of entries) {
        let score = 0;
        const titleRanges: Range[] = [];
        const bodyRanges: Range[] = [];
        let everyTerm = true;
        for (const term of terms) {
          const inTitle = wordStarts(entry.title, term);
          const inBody = wordStarts(entry.body, term);
          if (inTitle.length === 0 && inBody.length === 0) {
            everyTerm = false;
            break;
          }
          titleRanges.push(...inTitle);
          bodyRanges.push(...inBody);
          score += (inTitle.length > 0 ? 10 : 0) + Math.min(inBody.length, 5);
        }
        if (!everyTerm) continue;
        if (terms.length > 1 && entry.title.text.includes(phrase)) score += 20;

        const merged = mergeRanges(bodyRanges);
        const { snippet, ranges } = makeSnippet(entry.item.body, merged);
        hits.push({
          item: entry.item,
          score,
          titleRanges: mergeRanges(titleRanges),
          snippet,
          snippetRanges: ranges,
        });
      }

      return hits.sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}
