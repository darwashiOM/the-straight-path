/**
 * Reading-time helpers for MDX articles.
 *
 * We compute reading time client-side from the raw MDX source (loaded via
 * `import.meta.glob(..., { query: '?raw' })`) using a fixed 220 wpm cadence —
 * the same pace used in `lib/utils.ts` so counts stay consistent wherever
 * reading time is shown.
 */

const WORDS_PER_MINUTE = 220;

/** Count "words" in an MDX body string, stripped of frontmatter and markdown noise. */
export function wordCount(raw: string): number {
  // Strip YAML frontmatter (between the first two `---` fences).
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  // Drop code fences, inline code, images and markdown link syntax so we count
  // only reader-visible text. This isn't perfect but it's close enough for a
  // reading-time indicator and it avoids pulling in a full markdown parser.
  const cleaned = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~\-]/g, ' ');
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/** Minutes-to-read for a raw MDX source, rounded to nearest whole minute (min 1). */
export function readingTimeMinutes(raw: string): number {
  const count = wordCount(raw);
  return Math.max(1, Math.round(count / WORDS_PER_MINUTE));
}
