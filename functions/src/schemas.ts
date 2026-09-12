/**
 * Firestore collection schemas.
 *
 * These interfaces describe the shape of documents in each collection and
 * are shared between Cloud Functions and (eventually) the admin panel.
 * Keep them conservative: additive changes only, and never change the
 * semantics of an existing field without a migration.
 *
 * Timestamps are typed as `unknown` here so this file stays
 * environment-agnostic (callers narrow to `admin.firestore.Timestamp` on
 * the server or `firebase.firestore.Timestamp` in the browser).
 */

export type FirestoreTimestamp = unknown;

/** Language code used throughout the site ("en", "ar", …). */
export type LocaleCode = 'en' | 'ar' | (string & {});

/** Publication status for editorial content. */
export type PublishStatus = 'draft' | 'review' | 'published' | 'archived';

/**
 * `articles/{slug}` — long-form editorial content.
 */
export interface Article {
  slug: string;
  title: string;
  summary: string;
  body: string; // MDX / markdown source
  locale: LocaleCode;
  /** Other locales of the same article, keyed by locale code. */
  translations?: Record<LocaleCode, string>;
  author?: string;
  tags?: string[];
  status: PublishStatus;
  readingTimeMinutes?: number;
  heroImage?: {
    src: string;
    webpSrc?: string;
    alt: string;
    width?: number;
    height?: number;
  };
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  publishedAt?: FirestoreTimestamp;
}

/**
 * `videos/{id}` — curated video references (YouTube, Vimeo, etc.).
 */
export interface Video {
  id: string;
  title: string;
  description?: string;
  provider: 'youtube' | 'vimeo' | 'direct' | (string & {});
  url: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  locale: LocaleCode;
  tags?: string[];
  status: PublishStatus;
  featured?: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * `links/{id}` — curated outbound resources (books, sites, talks).
 */
export interface Link {
  id: string;
  title: string;
  description?: string;
  url: string;
  category?: 'book' | 'site' | 'lecture' | 'podcast' | 'tool' | (string & {});
  locale?: LocaleCode;
  tags?: string[];
  status: PublishStatus;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * `faqs/{id}` — a single FAQ entry.
 */
export interface Faq {
  id: string;
  question: string;
  answer: string; // markdown
  locale: LocaleCode;
  category?: string;
  /** Lower numbers sort first within a category. */
  order?: number;
  status: PublishStatus;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * `contact-submissions/{id}` — inbound contact-form messages.
 *
 * Writes are constrained by `firestore.rules`; Cloud Functions triggers
 * notify the admin team on creation (see `onContactSubmission`).
 */
export type SupportServiceKey = 'mentor' | 'quran' | 'hijab';

/** US-only shipping address collected when a Qur'an or hijab is requested. */
export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

/** Optional new-Muslim support request attached to a contact submission. */
export interface SupportRequest {
  requests: SupportServiceKey[];
  details?: string;
  phone?: string;
  address?: ShippingAddress;
}

/** Outcome of one notification channel, written by `onContactSubmission`. */
export type NotificationOutcome =
  | { ok: true; at: FirestoreTimestamp; id: string; url?: string }
  | { ok: false; at: FirestoreTimestamp; error: string };

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  locale?: LocaleCode;
  /** `question` (plain message) or `support` (new-Muslim support request). */
  type?: 'question' | 'support';
  support?: SupportRequest;
  /** IP, user-agent, etc. — populated server-side only; never trust client. */
  meta?: {
    userAgent?: string;
    ip?: string;
    referrer?: string;
  };
  status: 'new' | 'read' | 'replied' | 'archived' | 'spam';
  /** Per-channel delivery results, written server-side after creation. */
  notifications?: {
    notion?: NotificationOutcome;
    email?: NotificationOutcome;
  };
  createdAt: FirestoreTimestamp;
  repliedAt?: FirestoreTimestamp;
}

/**
 * `admins/{uid}` — an authenticated user authorised to use the admin panel.
 */
export interface Admin {
  uid: string;
  email: string;
  displayName?: string;
  role: 'owner' | 'editor' | 'moderator';
  /** Coarse-grained feature flags for future capability checks. */
  capabilities?: {
    publishArticles?: boolean;
    manageFaqs?: boolean;
    manageContact?: boolean;
    manageAdmins?: boolean;
  };
  createdAt: FirestoreTimestamp;
  lastLoginAt?: FirestoreTimestamp;
  disabled?: boolean;
}
