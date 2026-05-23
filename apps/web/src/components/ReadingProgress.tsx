import { useEffect, useState } from 'react';

interface ReadingProgressProps {
  /** Ref to the `<article>` element whose scroll progress we track. */
  target: React.RefObject<HTMLElement>;
  /** Pixel offset for the sticky navbar (bar sits just below it). */
  topOffset?: number;
}

/**
 * A thin accent-coloured progress bar fixed at the top of the viewport (below
 * the sticky navbar) that fills as the user scrolls through the target
 * article element. Uses `requestAnimationFrame` to rate-limit scroll work.
 * Honours `prefers-reduced-motion` by removing width-transitions.
 */
export default function ReadingProgress({ target, topOffset = 64 }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    let raf = 0;
    const compute = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      // Total scrollable distance across the article: height minus viewport,
      // but never less than 1 (avoids div-by-zero for very short articles).
      const total = Math.max(1, rect.height - viewport);
      // How far past the top of the article we've scrolled.
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const next = scrolled / total;
      setProgress(next);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [target]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 z-30 h-0.5 bg-transparent"
      style={{ top: topOffset }}
    >
      <div
        className="bg-accent-500 h-full origin-left"
        style={{
          transform: `scaleX(${progress})`,
          transition: reduced ? 'none' : 'transform 120ms linear',
          width: '100%',
        }}
      />
    </div>
  );
}
