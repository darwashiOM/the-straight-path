import { readingTimes } from './reading-times.generated';

/** Canonical topic identifiers. Kept string-wide to avoid compile-time churn
 *  when new topics are seeded in a single MDX file and haven't been wired
 *  through the `<TopicChips>` list yet. */
export type ArticleTopic =
  | 'foundations'
  | 'creed'
  | 'quran'
  | 'prophet'
  | 'character'
  | 'practice'
  | 'comparative-religion'
  | (string & {});

export interface ArticleFrontmatter {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  tags?: string[];
  heroImage?: string;
  draft?: boolean;
  /** Primary topic used for chip-based filtering. */
  topic?: ArticleTopic;
  /** Slug of a `Series` this article belongs to, if any. */
  series?: string;
}

export interface ArticleModule {
  frontmatter: ArticleFrontmatter;
  /** Minutes-to-read, computed from MDX body word count at build time. */
  readingTime: number;
  Component: React.ComponentType;
}

type MdxImport = {
  frontmatter: ArticleFrontmatter;
  default: React.ComponentType;
};

// Eagerly import each MDX file as a compiled module. Reading times are
// pre-computed from the raw source at build time by
// `scripts/generate-reading-times.mjs` — we can't use a `?raw` glob here
// because the MDX Rollup plugin (enforce: 'pre') intercepts queries on
// `.mdx` files, returning the compiled module instead of the raw text.
const modules = import.meta.glob<MdxImport>('./*.mdx', { eager: true });

export const articles: ArticleModule[] = Object.values(modules)
  .map((mod) => {
    const slug = mod.frontmatter.slug;
    return {
      frontmatter: mod.frontmatter,
      readingTime: readingTimes[slug] ?? 1,
      Component: mod.default,
    };
  })
  .sort(
    (a, b) =>
      new Date(b.frontmatter.publishedAt).getTime() - new Date(a.frontmatter.publishedAt).getTime(),
  );

export function getArticle(slug: string): ArticleModule | undefined {
  return articles.find((a) => a.frontmatter.slug === slug);
}

export function getPublishedArticles(): ArticleModule[] {
  return articles.filter((a) => !a.frontmatter.draft);
}

/** All articles visible to the current viewer — published always, drafts only
 *  when the `showDrafts` flag is true (either via `?showDrafts=1` or admin). */
export function getVisibleArticles(showDrafts: boolean): ArticleModule[] {
  return showDrafts ? articles : getPublishedArticles();
}

/** Articles in a given series, in the order declared by `series.ts` —
 *  silently skipping any that are missing or hidden from the viewer. */
export function getArticlesInSeries(
  seriesSlug: string,
  orderedSlugs: string[],
  showDrafts: boolean,
): ArticleModule[] {
  const pool = getVisibleArticles(showDrafts);
  return orderedSlugs
    .map((slug) => pool.find((a) => a.frontmatter.slug === slug))
    .filter((a): a is ArticleModule => Boolean(a) && a!.frontmatter.series === seriesSlug);
}
