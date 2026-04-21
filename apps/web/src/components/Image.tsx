import { forwardRef, type ImgHTMLAttributes } from 'react';
import clsx from 'clsx';

type NativeImgProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'loading' | 'decoding' | 'fetchPriority'
>;

export interface ImageProps extends NativeImgProps {
  /** Image source (fallback format — usually JPG or PNG). */
  src: string;
  /** Required, meaningful alt text. Use `alt=""` for purely decorative images. */
  alt: string;
  /** Intrinsic width in pixels. Strongly recommended to prevent CLS. */
  width?: number;
  /** Intrinsic height in pixels. Strongly recommended to prevent CLS. */
  height?: number;
  /**
   * CSS aspect ratio (e.g. `"16 / 9"`, `"4 / 3"`). Applied to the wrapping
   * `<picture>` so layout is reserved even before width/height are known.
   */
  aspectRatio?: string;
  /** Optional WebP (or AVIF) source for browsers that support it. */
  webpSrc?: string;
  /** Mark as above-the-fold / LCP: eager-load and set `fetchpriority="high"`. */
  priority?: boolean;
  /** Extra class applied to the `<img>` element. */
  className?: string;
  /** Extra class applied to the wrapping `<picture>` element. */
  pictureClassName?: string;
}

/**
 * Accessible, performance-friendly `<img>` wrapper.
 *
 * - Lazy-loads and async-decodes by default.
 * - Reserves layout via explicit width/height and optional `aspectRatio`.
 * - Emits a `<picture>` with a WebP source when `webpSrc` is provided.
 * - Use `priority` for the single above-the-fold / LCP image on a page.
 */
const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  {
    src,
    alt,
    width,
    height,
    aspectRatio,
    webpSrc,
    priority = false,
    className,
    pictureClassName,
    style,
    ...rest
  },
  ref,
) {
  const loading = priority ? 'eager' : 'lazy';
  const fetchPriority = priority ? 'high' : 'auto';

  const pictureStyle = aspectRatio ? { aspectRatio } : undefined;

  const img = (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      className={clsx('h-auto max-w-full', className)}
      style={style}
      {...rest}
    />
  );

  if (!webpSrc) {
    if (!aspectRatio) return img;
    return (
      <picture className={pictureClassName} style={pictureStyle}>
        {img}
      </picture>
    );
  }

  return (
    <picture className={pictureClassName} style={pictureStyle}>
      <source srcSet={webpSrc} type="image/webp" />
      {img}
    </picture>
  );
});

export default Image;
