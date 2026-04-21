/**
 * Canonical Firestore content schemas. Consumed by both the public site
 * loaders and the admin editors. Every doc embeds locale variants in a
 * `translations: { en, ar? }` map — one-doc-per-item keeps admin UX simple
 * and keeps read cost low.
 *
 * Every doc carries a `schemaVersion` so we can migrate safely.
 */
import type { Timestamp } from 'firebase/firestore';

export type Locale = 'en' | 'ar';

export interface Translatable<T> {
  en: T;
  ar?: T;
}

/** Unwrap a translation for a given locale; falls back to `en` when the
 *  requested locale is missing a value. */
export function pickLocale<T>(tr: Translatable<T>, locale: Locale): T {
  if (locale === 'ar' && tr.ar !== undefined) return tr.ar;
  return tr.en;
}

// ---------- Articles ----------

export type ArticleStatus = 'draft' | 'scheduled' | 'published';

export interface ArticleDoc {
  slug: string;
  status: ArticleStatus;
  publishedAt: string;      // ISO date
  scheduledAt?: string;     // ISO date, when status === 'scheduled'
  author: string;
  tags: string[];
  topic?: string;           // slug of /topics/{topic}
  series?: string;          // slug of /series/{series}
  heroImage?: string;
  translations: Translatable<{
    title: string;
    excerpt: string;
    body: string;           // markdown source
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Resources ----------

export interface ResourceDoc {
  url: string;
  category: string;         // slug — e.g. 'quran', 'hadith', 'research', 'study'
  order: number;
  translations: Translatable<{
    title: string;
    description: string;
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- FAQs ----------

export interface FaqDoc {
  category: string;
  order: number;
  translations: Translatable<{
    question: string;
    answer: string;
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Channels ----------

export interface ChannelDoc {
  url: string;
  order: number;
  translations: Translatable<{
    name: string;
    description: string;
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Series ----------

export interface SeriesDoc {
  slug: string;
  order: number;
  articleSlugs: string[];
  translations: Translatable<{
    title: string;
    description: string;
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Topics ----------

export interface TopicDoc {
  slug: string;
  order: number;
  translations: Translatable<{
    label: string;
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Site settings ----------
// One doc per logical surface. IDs are fixed strings.

export type SiteSettingId =
  | 'hero'
  | 'quranBanner'
  | 'aboutPreview'
  | 'startHere'
  | 'seoDefaults'
  | 'navLabels'
  | 'footer'
  | 'quranAbout'
  | 'learnHeader'
  | 'articlesHeader';

/** siteSettings docs have heterogeneous shapes; editors pick the right
 *  fields per id. A union would be tedious so we accept a loose record
 *  and narrow it at the consumer. */
export interface SiteSettingDoc<T = Record<string, string>> {
  id: SiteSettingId;
  schemaVersion: 1;
  translations: Translatable<T>;
  /** For settings that also hold non-locale fields (e.g. startHere's ordered article list). */
  data?: Record<string, unknown>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Editorial pages ----------

export interface PageDoc {
  slug: 'about' | 'privacy' | 'terms';
  translations: Translatable<{
    title: string;
    body: string; // markdown
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Media (Firebase Storage) ----------

export interface MediaDoc {
  id: string;
  url: string;
  path: string; // storage path
  contentType: string;
  size: number; // bytes
  alt: string;
  tags?: string[];
  uploadedBy: string;
  createdAt?: Timestamp;
}

// ---------- Audit log ----------

export interface AuditLogDoc {
  uid: string;
  email: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  docId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  at: Timestamp;
}
