import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

interface ArticleTocProps {
  /** Ref to the article body element whose h2 headings drive the TOC. */
  bodyRef: React.RefObject<HTMLElement>;
  /** Pixel offset applied when scrolling to a heading (for sticky nav). */
  scrollOffset?: number;
}

/** Slugify a heading label for use as an anchor id. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Sticky, right-rail Table of Contents for an article.
 *
 * - Reads `h2` elements out of the passed-in article body after mount,
 *   assigning stable slugified ids to headings that don't already have one.
 * - Tracks the active section using an IntersectionObserver so the TOC
 *   highlights whichever heading is currently in the reader's viewport.
 * - Clicking a link smooth-scrolls to the heading with an offset for the
 *   global sticky navbar.
 * - Hidden on mobile; visible from `lg` upwards.
 */
export default function ArticleToc({ bodyRef, scrollOffset = 96 }: ArticleTocProps) {
  const { t } = useTranslation();
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Collect headings whenever the article body becomes available.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const nodes = Array.from(body.querySelectorAll<HTMLHeadingElement>('h2'));
    const usedIds = new Set<string>();
    const collected: TocHeading[] = nodes.map((node) => {
      const text = (node.textContent ?? '').trim();
      let id = node.id || slugify(text);
      // Ensure uniqueness even if two headings slugify to the same value.
      if (!id) id = 'section';
      let candidate = id;
      let n = 2;
      while (usedIds.has(candidate)) {
        candidate = `${id}-${n++}`;
      }
      usedIds.add(candidate);
      if (!node.id) node.id = candidate;
      // Let anchor targets clear the sticky nav.
      node.style.scrollMarginTop = `${scrollOffset}px`;
      return { id: candidate, text, level: 2 };
    });

    setHeadings(collected);

    if (collected.length === 0) return;

    // IntersectionObserver: the heading nearest the top of the viewport is
    // "active". A top-rootMargin of `-80px` accounts for the sticky navbar;
    // the bottom margin shrinks the observed band so only one heading is
    // active at a time.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: `-${scrollOffset}px 0px -70% 0px`,
        threshold: 0,
      },
    );

    nodes.forEach((n) => observer.observe(n));
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [bodyRef, scrollOffset]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top - scrollOffset;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    // Update the URL without triggering a jump.
    window.history.replaceState(null, '', `#${id}`);
    setActiveId(id);
  };

  if (headings.length === 0) return null;

  const label = (t('articlesPage.tocTitle', 'On this page') as string) || 'On this page';

  return (
    <nav
      aria-label={label}
      className="sticky top-24 hidden max-h-[calc(100vh-8rem)] w-60 shrink-0 overflow-y-auto lg:block"
    >
      <p className="text-accent-500 mb-3 font-serif text-xs uppercase tracking-widest">{label}</p>
      <ul className="border-primary-500/20 dark:border-primary-700/50 space-y-2 border-l text-sm">
        {headings.map((h) => {
          const isActive = h.id === activeId;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => handleClick(e, h.id)}
                className={
                  '-ml-px block border-l-2 py-0.5 pl-3 transition-colors ' +
                  (isActive
                    ? 'border-accent-500 text-primary-700 dark:text-accent-300 font-medium'
                    : 'text-ink/60 hover:text-primary-600 dark:text-paper/60 dark:hover:text-accent-400 border-transparent')
                }
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
