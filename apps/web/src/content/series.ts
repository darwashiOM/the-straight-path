/**
 * Named article series — curated reading orders across multiple articles.
 *
 * A series is a small, authored sequence: "read these, in this order, to
 * understand a theme." It is separate from topics (which are single-tag
 * filters) and from the curated Start-Here row (which is page-level, not
 * content-level).
 *
 * Series are rendered on the Learn page via <SeriesCard>, and individual
 * article frontmatter may reference a series slug so the article page and
 * listings can show "Part of the … series" affordances.
 */

export interface Series {
  /** Stable URL slug (kebab-case). Matches frontmatter `series:` values. */
  slug: string;
  /** Display title — short enough to fit on a card header. */
  title: string;
  /** One-sentence description, shown on the Learn page. */
  description: string;
  /**
   * Article slugs, in reading order. Articles that don't yet exist (or are
   * drafts hidden from the reader) are simply skipped at render time —
   * defining them here up-front lets a series grow gracefully as drafts
   * are published.
   */
  articleSlugs: string[];
}

export const series: Series[] = [
  {
    slug: 'foundations-of-islam',
    title: 'Foundations of Islam',
    description:
      "Start at the beginning. A short reading order covering what Islam is, why we were created, the core practices, and a ten-point overview for the curious.",
    articleSlugs: [
      'what-is-islam',
      'why-did-god-create-you',
      'the-five-pillars',
      '10-things-to-know-about-islam',
    ],
  },
];

export function getSeries(slug: string): Series | undefined {
  return series.find((s) => s.slug === slug);
}
