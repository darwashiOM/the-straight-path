import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';

const SearchDialog = lazy(() => import('./SearchDialog'));

interface CommandKProps {
  className?: string;
  /**
   * Visual variants:
   *  - `'auto'` (default): render the pill on md+ and a compact icon below.
   *  - `'pill'`: always the pill (hidden on mobile).
   *  - `'icon'`: always the compact icon button.
   */
  variant?: 'auto' | 'pill' | 'icon';
}

/**
 * `<CommandK>` — the navbar entry point for global search. Renders a small
 * button with a keyboard hint and owns the open/close state for the
 * `<SearchDialog>`, which is lazy-loaded so the Fuse bundle stays off the
 * critical path.
 *
 * Also installs the global `⌘K` / `Ctrl+K` keyboard shortcut.
 */
export default function CommandK({ className, variant = 'auto' }: CommandKProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || ''));
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        // Avoid conflict with browser address-bar shortcut by requiring
        // that we are not inside a contenteditable.
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const shortcut = isMac ? '⌘K' : 'Ctrl K';
  const label = t('search.open', { defaultValue: 'Open search' }) as string;
  const short = t('search.short', { defaultValue: 'Search' }) as string;

  const pill = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={label}
      className={cn(
        'items-center gap-2 rounded-lg border border-primary-500/15 bg-paper/60 px-3 py-1.5 text-xs text-ink/60 transition-colors hover:border-primary-500/30 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 dark:border-primary-700/50 dark:bg-primary-900/40 dark:text-paper/60 dark:hover:bg-primary-800',
        variant === 'auto' ? 'hidden md:flex' : 'flex',
        className,
      )}
    >
      <Search size={14} aria-hidden="true" />
      <span>{short}</span>
      <kbd className="ms-2 rounded border border-primary-500/20 bg-paper px-1.5 py-0.5 font-mono text-2xs dark:border-primary-700/60 dark:bg-primary-900">
        {shortcut}
      </kbd>
    </button>
  );

  const icon = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={label}
      title={`${short} (${shortcut})`}
      className={cn(
        'btn-ghost !px-2 !py-2',
        variant === 'auto' ? 'md:hidden' : '',
        className,
      )}
    >
      <Search size={16} aria-hidden="true" />
    </button>
  );

  return (
    <>
      {variant === 'pill' ? pill : variant === 'icon' ? icon : (
        <>
          {pill}
          {icon}
        </>
      )}

      {open ? (
        <Suspense fallback={null}>
          <SearchDialog open={open} onClose={close} />
        </Suspense>
      ) : null}
    </>
  );
}
