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
  publishedAt: string; // ISO date
  scheduledAt?: string; // ISO date, when status === 'scheduled'
  author: string;
  tags: string[];
  topic?: string; // slug of /topics/{topic}
  series?: string; // slug of /series/{series}
  heroImage?: string;
  translations: Translatable<{
    title: string;
    excerpt: string;
    body: string; // markdown source
  }>;
  schemaVersion: 1;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ---------- Resources ----------

export interface ResourceDoc {
  url: string;
  category: string; // slug — e.g. 'quran', 'hadith', 'research', 'study'
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
  | 'articlesHeader'
  | 'brand'
  | 'navItems'
  | 'quickLinks'
  | 'footerNav'
  | 'resourcesHeader'
  | 'faqHeader'
  | 'socialHeader'
  | 'contactIntro'
  | 'notFound'
  | 'seo'
  | 'homepageSections'
  | 'featured';

// ---------- Homepage section ordering ----------

export type HomepageSectionId =
  | 'hero'
  | 'featured'
  | 'learnRow'
  | 'quranBanner'
  | 'quickLinks'
  | 'aboutPreview';

export interface HomepageSection {
  id: HomepageSectionId;
  visible: boolean;
  order: number;
}

export interface HomepageSectionsData {
  sections: HomepageSection[];
}

export interface FeaturedData {
  mode: 'newest' | 'manual';
  articleSlug?: string;
}

// ---------- SEO defaults / per-route overrides ----------

export interface SeoDefaults {
  titleSuffix: string;
  defaultDescriptionEn: string;
  defaultDescriptionAr: string;
  defaultOgImageUrl: string;
}

export interface SeoRouteOverride {
  titleEn?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
}

export interface SeoData {
  defaults: SeoDefaults;
  routes: Record<string, SeoRouteOverride>;
}

// ---------- Not-found popular links ----------

export interface NotFoundPopularLink {
  to: string;
  labelEn: string;
  labelAr: string;
  hintEn: string;
  hintAr: string;
}

export interface NotFoundData {
  popularLinks: NotFoundPopularLink[];
}

// ---------- Contact form labels ----------

export interface ContactFormLabels {
  name: string;
  email: string;
  message: string;
  submit: string;
  submittingLabel: string;
  successTitle: string;
  successBody: string;
  errorBody: string;
}

/**
 * Shape of the `brand` siteSetting's translations — site identity shown in
 * the navbar, footer, and Open-Graph defaults. `data.logoUrl` (if set) turns
 * the navbar's accent-dot into an `<img>` element; `data.ogImage` is used as
 * the site-wide default social-share image.
 */
export interface BrandTranslations {
  siteName: string;
  tagline?: string;
}
export interface BrandData {
  logoUrl?: string;
  ogImage?: string;
}

/**
 * Shape of the `navItems` siteSetting's `data.items` — the ordered list of
 * navbar entries. `to` is a *canonical* path with no locale prefix; the
 * navbar composes the locale via `useLocalizedPath.localizePath()`. Labels
 * are embedded per-locale on each item so the structure itself is
 * locale-agnostic (hence no `translations` on this doc).
 */
export interface NavItem {
  to: string;
  key: string;
  labelEn: string;
  labelAr: string;
  visible: boolean;
  order: number;
}
export interface NavItemsData {
  items: NavItem[];
}

/**
 * Shape of the `quickLinks` siteSetting's `data.items` — the four-card grid
 * at the bottom of the homepage. `to` is canonical (no locale prefix); the
 * renderer localizes it. `icon` maps to a lucide-react component in
 * HomePage.
 */
export type QuickLinkIcon = 'users' | 'link' | 'help' | 'message' | 'book' | 'star' | 'mail';

export interface QuickLinkItem {
  to: string;
  icon: QuickLinkIcon;
  visible: boolean;
  order: number;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
}

export interface QuickLinksData {
  items: QuickLinkItem[];
}

/**
 * Shape of the `footerNav` siteSetting's `data.columns` — the four footer
 * navigation columns. Each link is either an internal locale-aware <Link>
 * or, when `external: true`, a new-tab <a>.
 */
export interface FooterNavLink {
  to: string;
  external?: boolean;
  labelEn: string;
  labelAr: string;
}

export interface FooterNavColumn {
  id: string;
  titleEn: string;
  titleAr: string;
  order: number;
  links: FooterNavLink[];
}

export interface FooterNavData {
  columns: FooterNavColumn[];
}

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
