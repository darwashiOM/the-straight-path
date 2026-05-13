import type { CSSProperties, HTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'rectangle' | 'card' | 'text-line';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Shape preset. Defaults to `"rectangle"`. */
  variant?: Variant;
  /** CSS width (e.g. `"100%"`, `240`). */
  width?: number | string;
  /** CSS height (e.g. `"1rem"`, `16`). */
  height?: number | string;
  /** For `text-line`, number of stacked lines to render. */
  lines?: number;
  /** Accessible label; defaults to a generic loading announcement. */
  label?: string;
}

/**
 * Reusable loading skeleton.
 *
 * Variants:
 * - `rectangle` (default): a plain block, useful for media and chips.
 * - `card`: a rectangle with rounded corners and card-like padding.
 * - `text-line`: one or more text-height pills; use `lines` to stack.
 *
 * Respects `prefers-reduced-motion` — the shimmer is replaced with a
 * gentle static tint for users who opt out of motion.
 */
export default function Skeleton({
  variant = 'rectangle',
  width,
  height,
  lines = 3,
  label = 'Loading…',
  className,
  style,
  ...rest
}: SkeletonProps) {
  const baseClass = clsx(
    // Base tint that works in both themes.
    'relative overflow-hidden bg-ink/10 dark:bg-paper/10',
    // Shimmer via gradient background; hidden when reduced-motion is on.
    'before:absolute before:inset-0 before:-translate-x-full',
    'before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent',
    'before:animate-[shimmer_1.4s_ease-in-out_infinite]',
    'motion-reduce:before:hidden motion-reduce:animate-none',
  );

  if (variant === 'text-line') {
    const n = Math.max(1, lines);
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className={clsx('flex flex-col gap-2', className)}
        {...rest}
      >
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            className={clsx(baseClass, 'h-3 rounded-full')}
            style={{
              width: i === n - 1 ? '72%' : '100%',
            }}
          />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className={clsx('border-ink/10 dark:border-paper/10 rounded-2xl border p-4', className)}
        style={style}
        {...rest}
      >
        <div className={clsx(baseClass, 'mb-4 h-40 w-full rounded-xl')} />
        <div className={clsx(baseClass, 'mb-2 h-4 w-3/4 rounded-full')} />
        <div className={clsx(baseClass, 'h-3 w-1/2 rounded-full')} />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  const rectStyle: CSSProperties = {
    width: width ?? '100%',
    height: height ?? '1rem',
    ...style,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={clsx(baseClass, 'rounded-md', className)}
      style={rectStyle}
      {...rest}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
