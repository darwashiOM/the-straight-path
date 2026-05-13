import { useMemo } from 'react';

import { cn } from '@/lib/utils';

/**
 * ArticleCover — a subtle, deterministic gradient "cover" for an article card.
 *
 * We derive the gradient from the article slug so each card gets a distinct
 * but stable visual identity without any authoring overhead. No random
 * state — the same slug always renders the same gradient, which also keeps
 * Lighthouse visual diffs clean and avoids hydration surprises.
 *
 * Palettes are intentionally muted and drawn from the TSP colour system
 * (primary teals + accent warm tones) so covers blend with the rest of the
 * site in both light and dark mode.
 */

interface ArticleCoverProps {
  slug: string;
  /** Short label overlaid on the cover — usually the article topic. */
  label?: string;
  /** Optional hero image URL. When present, the image fills the cover
   *  instead of the gradient. Alt text falls back to the label or slug. */
  image?: string;
  /** Alt text for the image (only used when `image` is set). */
  alt?: string;
  /** Tailwind aspect ratio utility. Default: 16/9. */
  aspect?: string;
  className?: string;
}

// Palette pairs as `from-* to-*` Tailwind class snippets. Keeping them as
// literal strings lets the JIT pick them up at build time. Using `as const`
// + a tuple shape keeps the indexed access type narrow under strict
// `noUncheckedIndexedAccess`.
type Palette = readonly [from: string, to: string, fromDark: string, toDark: string];

const PALETTES = [
  ['from-primary-100', 'to-accent-100', 'dark:from-primary-700', 'dark:to-primary-900'],
  ['from-accent-100', 'to-primary-200', 'dark:from-accent-800', 'dark:to-primary-800'],
  ['from-primary-200', 'to-primary-50', 'dark:from-primary-600', 'dark:to-primary-900'],
  ['from-accent-200', 'to-paper', 'dark:from-accent-700', 'dark:to-primary-900'],
  ['from-primary-50', 'to-accent-200', 'dark:from-primary-800', 'dark:to-accent-800'],
  ['from-primary-100', 'to-primary-300', 'dark:from-primary-700', 'dark:to-primary-500'],
] as const satisfies readonly Palette[];

function hashSlug(slug: string): number {
  // djb2 — small, fast, and stable across runs. Plenty for a 6-bucket pick.
  let h = 5381;
  for (let i = 0; i < slug.length; i++) {
    h = ((h << 5) + h + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function ArticleCover({
  slug,
  label,
  image,
  alt,
  aspect = 'aspect-[16/9]',
  className,
}: ArticleCoverProps) {
  const gradient = useMemo(() => {
    // PALETTES is a non-empty literal — index 0 is always defined — but we
    // pick defensively so `noUncheckedIndexedAccess` stays silent.
    const idx = hashSlug(slug) % PALETTES.length;
    const palette: Palette = PALETTES[idx] ?? PALETTES[0]!;
    return palette.join(' ');
  }, [slug]);

  // When a real hero image is provided we render that in the cover slot;
  // the gradient stays as a background so broken/slow images still show a
  // tasteful placeholder underneath.
  if (image) {
    return (
      <div
        className={cn(
          'relative w-full overflow-hidden bg-gradient-to-br',
          aspect,
          gradient,
          className,
        )}
      >
        <img
          src={image}
          alt={alt ?? label ?? slug}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            // Hide a broken image so the gradient + label show through.
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {label ? (
          <span className="text-primary-800 dark:bg-primary-900/70 dark:text-accent-200 absolute bottom-3 start-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative w-full overflow-hidden bg-gradient-to-br',
        aspect,
        gradient,
        className,
      )}
    >
      {/* Soft radial highlight for a touch of depth. Pure CSS — no image weight. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(120% 80% at 20% 10%, rgba(255,255,255,0.6), rgba(255,255,255,0) 60%)',
        }}
      />
      {label ? (
        <span className="text-primary-800 dark:bg-primary-900/60 dark:text-accent-200 absolute bottom-3 start-3 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}
