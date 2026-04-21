/**
 * Public content hooks — merge Firestore content with the MDX/hardcoded
 * fallbacks so public pages get a live CMS when available and never break
 * when Firestore is empty or offline.
 *
 * Every hook here is read-only and safe to call from unauthenticated pages.
 * Writes go through `admin-firestore.ts`.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';

import { getDb } from './firebase';
import { articles as mdxArticles, type ArticleFrontmatter } from '@/content/articles';

// ---------- Articles ----------

export interface PublicArticle {
  slug: string;
  title: string;
  excerpt: string;
  body?: string; // Only present for Firestore articles
  publishedAt: string;
  author: string;
  tags: string[];
  heroImage?: string;
  source: 'mdx' | 'firestore';
  locale: 'en' | 'ar';
}

interface FirestoreArticleDoc {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  status?: string;
  locale?: string;
  author?: string;
  tags?: string[];
  heroImage?: string;
  publishedAt?: string;
}

function normalizeMdx(fm: ArticleFrontmatter): PublicArticle {
  return {
    slug: fm.slug,
    title: fm.title,
    excerpt: fm.excerpt,
    publishedAt: fm.publishedAt,
    author: fm.author,
    tags: fm.tags ?? [],
    heroImage: fm.heroImage,
    source: 'mdx',
    locale: 'en',
  };
}

export function useArticles() {
  return useQuery({
    queryKey: ['public', 'articles'],
    staleTime: 1000 * 60,
    queryFn: async (): Promise<PublicArticle[]> => {
      const mdx = mdxArticles
        .filter((a) => !a.frontmatter.draft)
        .map((a) => normalizeMdx(a.frontmatter));

      let fsArticles: PublicArticle[] = [];
      try {
        const snap = await getDocs(
          query(collection(getDb(), 'articles'), where('status', '==', 'published')),
        );
        fsArticles = snap.docs.map((d) => {
          const data = d.data() as FirestoreArticleDoc;
          return {
            slug: data.slug ?? d.id,
            title: data.title ?? '(untitled)',
            excerpt: data.excerpt ?? '',
            body: data.body,
            publishedAt: data.publishedAt ?? new Date().toISOString(),
            author: data.author ?? 'The Straight Path',
            tags: data.tags ?? [],
            heroImage: data.heroImage,
            source: 'firestore' as const,
            locale: (data.locale as 'en' | 'ar') ?? 'en',
          };
        });
      } catch {
        // Firestore unreachable or rules blocked — fall back to MDX silently.
      }

      // Firestore wins on slug collision.
      const bySlug = new Map<string, PublicArticle>();
      for (const a of mdx) bySlug.set(a.slug, a);
      for (const a of fsArticles) bySlug.set(a.slug, a);
      return [...bySlug.values()].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    },
  });
}

// ---------- Resources ----------

export interface PublicResource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  order: number;
}

export function useResources(fallback: PublicResource[] = []) {
  return useQuery({
    queryKey: ['public', 'resources'],
    staleTime: 1000 * 60,
    queryFn: async (): Promise<PublicResource[]> => {
      try {
        const snap = await getDocs(collection(getDb(), 'resources'));
        if (snap.empty) return fallback;
        return snap.docs
          .map((d) => {
            const data = d.data() as Omit<PublicResource, 'id'>;
            return {
              id: d.id,
              title: data.title ?? '',
              url: data.url ?? '#',
              description: data.description ?? '',
              category: data.category ?? 'General',
              order: data.order ?? 999,
            };
          })
          .sort((a, b) => a.order - b.order);
      } catch {
        return fallback;
      }
    },
  });
}

// ---------- FAQs ----------

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

export function useFaqs(fallback: PublicFaq[] = []) {
  return useQuery({
    queryKey: ['public', 'faqs'],
    staleTime: 1000 * 60,
    queryFn: async (): Promise<PublicFaq[]> => {
      try {
        const snap = await getDocs(collection(getDb(), 'faqs'));
        if (snap.empty) return fallback;
        return snap.docs
          .map((d) => {
            const data = d.data() as Omit<PublicFaq, 'id'>;
            return {
              id: d.id,
              question: data.question ?? '',
              answer: data.answer ?? '',
              category: data.category ?? 'General',
              order: data.order ?? 999,
            };
          })
          .sort((a, b) => a.order - b.order);
      } catch {
        return fallback;
      }
    },
  });
}

// ---------- Channels ----------

export interface PublicChannel {
  id: string;
  name: string;
  url: string;
  description: string;
  order: number;
}

export function useChannels(fallback: PublicChannel[] = []) {
  return useQuery({
    queryKey: ['public', 'channels'],
    staleTime: 1000 * 60,
    queryFn: async (): Promise<PublicChannel[]> => {
      try {
        const snap = await getDocs(collection(getDb(), 'channels'));
        if (snap.empty) return fallback;
        return snap.docs
          .map((d) => {
            const data = d.data() as Omit<PublicChannel, 'id'>;
            return {
              id: d.id,
              name: data.name ?? '',
              url: data.url ?? '#',
              description: data.description ?? '',
              order: data.order ?? 999,
            };
          })
          .sort((a, b) => a.order - b.order);
      } catch {
        return fallback;
      }
    },
  });
}
