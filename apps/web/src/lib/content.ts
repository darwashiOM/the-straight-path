/**
 * Public content hooks — read-only loaders for the Firestore-backed site.
 *
 * Every hook returns a `{ data, isLoading }` shape via React Query. Docs
 * are normalized against the typed schemas in `content-schema.ts` and
 * fall back to the built-in defaults in `content-defaults.ts` whenever
 * Firestore is empty, unreachable, or rules block the read — so the site
 * never blanks out even on a cold project.
 */
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';

import { getDb } from './firebase';
import {
  pickLocale,
  type ArticleDoc,
  type ChannelDoc,
  type FaqDoc,
  type Locale,
  type PageDoc,
  type ResourceDoc,
  type SeriesDoc,
  type SiteSettingId,
  type TopicDoc,
} from './content-schema';
import {
  DEFAULT_CHANNELS,
  DEFAULT_FAQS,
  DEFAULT_PAGES,
  DEFAULT_RESOURCES,
  DEFAULT_SERIES,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_TOPICS,
} from './content-defaults';
import { isPreviewMode, readPreview } from './preview';

const STALE = 1000 * 60; // 1 minute

// ---------- Public view models ----------

export interface PublicArticle {
  slug: string;
  status: ArticleDoc['status'];
  publishedAt: string;
  author: string;
  tags: string[];
  topic?: string;
  series?: string;
  heroImage?: string;
  title: string;
  excerpt: string;
  body: string;
  locale: Locale;
}

export interface PublicResource {
  id: string;
  url: string;
  category: string;
  order: number;
  title: string;
  description: string;
}

export interface PublicFaq {
  id: string;
  category: string;
  order: number;
  question: string;
  answer: string;
}

export interface PublicChannel {
  id: string;
  url: string;
  order: number;
  name: string;
  description: string;
}

export interface PublicSeries {
  slug: string;
  order: number;
  articleSlugs: string[];
  title: string;
  description: string;
}

export interface PublicTopic {
  slug: string;
  order: number;
  label: string;
}

export interface PublicSiteSetting<T = Record<string, string>> {
  id: SiteSettingId;
  value: T;
  data?: Record<string, unknown>;
}

export interface PublicPage {
  slug: string;
  title: string;
  body: string;
}

// ---------- Hooks ----------

function firestoreOr<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch(() => fallback);
}

export function useArticles(locale: Locale) {
  return useQuery({
    queryKey: ['content', 'articles', locale],
    staleTime: STALE,
    queryFn: async (): Promise<PublicArticle[]> => {
      return firestoreOr(async () => {
        const snap = await getDocs(
          query(collection(getDb(), 'articles'), where('status', 'in', ['published', 'draft'])),
        );
        return snap.docs
          .map((d) => projectArticle(d.data() as ArticleDoc, locale))
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      }, []);
    },
  });
}

export function usePublishedArticles(locale: Locale) {
  const q = useArticles(locale);
  return { ...q, data: (q.data ?? []).filter((a) => a.status === 'published') };
}

export function useArticle(slug: string | undefined, locale: Locale) {
  return useQuery({
    queryKey: ['content', 'article', slug ?? '', locale, isPreviewMode() ? 'preview' : 'live'],
    enabled: !!slug,
    staleTime: STALE,
    queryFn: async (): Promise<PublicArticle | null> => {
      if (!slug) return null;
      if (isPreviewMode()) {
        const staged = readPreview<ArticleDoc>('article', slug);
        if (staged) return projectArticle(staged, locale);
      }
      return firestoreOr(async () => {
        const snap = await getDoc(doc(getDb(), 'articles', slug));
        if (!snap.exists()) return null;
        return projectArticle(snap.data() as ArticleDoc, locale);
      }, null);
    },
  });
}

export function useResources(locale: Locale) {
  return useQuery({
    queryKey: ['content', 'resources', locale],
    staleTime: STALE,
    queryFn: async (): Promise<PublicResource[]> => {
      return firestoreOr(async () => {
        const snap = await getDocs(query(collection(getDb(), 'resources'), orderBy('order')));
        if (snap.empty) return fallbackResources(locale);
        return snap.docs.map((d) => projectResource(d.id, d.data() as ResourceDoc, locale));
      }, fallbackResources(locale));
    },
  });
}

export function useFaqs(locale: Locale) {
  return useQuery({
    queryKey: ['content', 'faqs', locale],
    staleTime: STALE,
    queryFn: async (): Promise<PublicFaq[]> => {
      return firestoreOr(async () => {
        const snap = await getDocs(query(collection(getDb(), 'faqs'), orderBy('order')));
        if (snap.empty) return fallbackFaqs(locale);
        return snap.docs.map((d) => projectFaq(d.id, d.data() as FaqDoc, locale));
      }, fallbackFaqs(locale));
    },
  });
}

export function useChannels(locale: Locale) {
  return useQuery({
    queryKey: ['content', 'channels', locale],
    staleTime: STALE,
    queryFn: async (): Promise<PublicChannel[]> => {
      return firestoreOr(async () => {
        const snap = await getDocs(query(collection(getDb(), 'channels'), orderBy('order')));
        if (snap.empty) return fallbackChannels(locale);
        return snap.docs.map((d) => projectChannel(d.id, d.data() as ChannelDoc, locale));
      }, fallbackChannels(locale));
    },
  });
}

export function useSeries(locale: Locale) {
  return useQuery({
    queryKey: ['content', 'series', locale],
    staleTime: STALE,
    queryFn: async (): Promise<PublicSeries[]> => {
      return firestoreOr(async () => {
        const snap = await getDocs(query(collection(getDb(), 'series'), orderBy('order')));
        if (snap.empty) return fallbackSeries(locale);
        return snap.docs.map((d) => projectSeries(d.data() as SeriesDoc, locale));
      }, fallbackSeries(locale));
    },
  });
}

export function useTopics(locale: Locale) {
  return useQuery({
    queryKey: ['content', 'topics', locale],
    staleTime: STALE,
    queryFn: async (): Promise<PublicTopic[]> => {
      return firestoreOr(async () => {
        const snap = await getDocs(query(collection(getDb(), 'topics'), orderBy('order')));
        if (snap.empty) return fallbackTopics(locale);
        return snap.docs.map((d) => projectTopic(d.data() as TopicDoc, locale));
      }, fallbackTopics(locale));
    },
  });
}

export function useSiteSetting<T = Record<string, string>>(id: SiteSettingId, locale: Locale) {
  return useQuery({
    queryKey: ['content', 'siteSettings', id, locale, isPreviewMode() ? 'preview' : 'live'],
    staleTime: STALE,
    queryFn: async (): Promise<PublicSiteSetting<T>> => {
      if (isPreviewMode()) {
        const staged = readPreview<{
          translations: { en: T; ar?: T };
          data?: Record<string, unknown>;
        }>('siteSetting', id);
        if (staged) {
          return {
            id,
            value: pickLocale(staged.translations, locale),
            data: staged.data,
          };
        }
      }
      return firestoreOr(
        async () => {
          const snap = await getDoc(doc(getDb(), 'siteSettings', id));
          if (!snap.exists()) return fallbackSiteSetting<T>(id, locale);
          const data = snap.data() as {
            translations: { en: T; ar?: T };
            data?: Record<string, unknown>;
          };
          return {
            id,
            value: pickLocale(data.translations, locale),
            data: data.data,
          };
        },
        fallbackSiteSetting<T>(id, locale),
      );
    },
  });
}

export function usePage(slug: 'about' | 'privacy' | 'terms', locale: Locale) {
  return useQuery({
    queryKey: ['content', 'pages', slug, locale, isPreviewMode() ? 'preview' : 'live'],
    staleTime: STALE,
    queryFn: async (): Promise<PublicPage | null> => {
      if (isPreviewMode()) {
        const staged = readPreview<PageDoc>('page', slug);
        if (staged) {
          const tr = pickLocale(staged.translations, locale);
          return { slug, title: tr.title, body: tr.body };
        }
      }
      return firestoreOr(
        async () => {
          const snap = await getDoc(doc(getDb(), 'pages', slug));
          if (!snap.exists()) return fallbackPage(slug, locale);
          const data = snap.data() as PageDoc;
          const tr = pickLocale(data.translations, locale);
          return { slug, title: tr.title, body: tr.body };
        },
        fallbackPage(slug, locale),
      );
    },
  });
}

// ---------- Projection helpers ----------

function projectArticle(data: ArticleDoc, locale: Locale): PublicArticle {
  const tr = pickLocale(data.translations, locale);
  return {
    slug: data.slug,
    status: data.status ?? 'draft',
    publishedAt: data.publishedAt ?? new Date().toISOString(),
    author: data.author ?? 'The Straight Path',
    tags: data.tags ?? [],
    topic: data.topic,
    series: data.series,
    heroImage: data.heroImage,
    title: tr.title,
    excerpt: tr.excerpt,
    body: tr.body,
    locale,
  };
}

function projectResource(id: string, data: ResourceDoc, locale: Locale): PublicResource {
  const tr = pickLocale(data.translations, locale);
  return {
    id,
    url: data.url,
    category: data.category,
    order: data.order ?? 999,
    title: tr.title,
    description: tr.description,
  };
}

function projectFaq(id: string, data: FaqDoc, locale: Locale): PublicFaq {
  const tr = pickLocale(data.translations, locale);
  return {
    id,
    category: data.category ?? 'general',
    order: data.order ?? 999,
    question: tr.question,
    answer: tr.answer,
  };
}

function projectChannel(id: string, data: ChannelDoc, locale: Locale): PublicChannel {
  const tr = pickLocale(data.translations, locale);
  return {
    id,
    url: data.url,
    order: data.order ?? 999,
    name: tr.name,
    description: tr.description,
  };
}

function projectSeries(data: SeriesDoc, locale: Locale): PublicSeries {
  const tr = pickLocale(data.translations, locale);
  return {
    slug: data.slug,
    order: data.order ?? 0,
    articleSlugs: data.articleSlugs ?? [],
    title: tr.title,
    description: tr.description,
  };
}

function projectTopic(data: TopicDoc, locale: Locale): PublicTopic {
  const tr = pickLocale(data.translations, locale);
  return { slug: data.slug, order: data.order ?? 999, label: tr.label };
}

// ---------- Fallbacks ----------

function fallbackResources(locale: Locale): PublicResource[] {
  return DEFAULT_RESOURCES.map((r) => ({
    id: r.id,
    url: r.url,
    category: r.category,
    order: r.order,
    title: pickLocale(r.translations, locale).title,
    description: pickLocale(r.translations, locale).description,
  }));
}

function fallbackFaqs(locale: Locale): PublicFaq[] {
  return DEFAULT_FAQS.map((f) => ({
    id: f.id,
    order: f.order,
    category: f.category,
    question: pickLocale(f.translations, locale).question,
    answer: pickLocale(f.translations, locale).answer,
  }));
}

function fallbackChannels(locale: Locale): PublicChannel[] {
  return DEFAULT_CHANNELS.map((c) => ({
    id: c.id,
    url: c.url,
    order: c.order,
    name: pickLocale(c.translations, locale).name,
    description: pickLocale(c.translations, locale).description,
  }));
}

function fallbackSeries(locale: Locale): PublicSeries[] {
  return DEFAULT_SERIES.map((s) => ({
    slug: s.slug,
    order: s.order,
    articleSlugs: s.articleSlugs,
    title: pickLocale(s.translations, locale).title,
    description: pickLocale(s.translations, locale).description,
  }));
}

function fallbackTopics(locale: Locale): PublicTopic[] {
  return DEFAULT_TOPICS.map((t) => ({
    slug: t.slug,
    order: t.order,
    label: pickLocale(t.translations, locale).label,
  }));
}

function fallbackSiteSetting<T>(id: SiteSettingId, locale: Locale): PublicSiteSetting<T> {
  const def = DEFAULT_SITE_SETTINGS.find((s) => s.id === id);
  if (!def) return { id, value: {} as T, data: undefined };
  return {
    id,
    value: pickLocale(def.translations, locale) as unknown as T,
    data: def.data,
  };
}

function fallbackPage(slug: 'about' | 'privacy' | 'terms', locale: Locale): PublicPage | null {
  const def = DEFAULT_PAGES.find((p) => p.id === slug);
  if (!def) return null;
  const tr = pickLocale(def.translations, locale);
  return { slug, title: tr.title, body: tr.body };
}
