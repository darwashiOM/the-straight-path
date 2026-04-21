import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ExternalLink, HelpCircle, Link as LinkIcon, Search, Users, X } from 'lucide-react';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import {
  buildSearchItems,
  createFuse,
  type FuseResult,
  type SearchItem,
  type SearchItemType,
} from '@/lib/search-index';
import { cn } from '@/lib/utils';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const RECENT_KEY = 'tsp:recent-searches';
const MAX_RECENT = 5;

const TYPE_META: Record<SearchItemType, { labelKey: string; defaultLabel: string; Icon: typeof BookOpen }> = {
  article: { labelKey: 'search.groups.articles', defaultLabel: 'Articles', Icon: BookOpen },
  faq: { labelKey: 'search.groups.faq', defaultLabel: 'FAQ', Icon: HelpCircle },
  resource: { labelKey: 'search.groups.resources', defaultLabel: 'Resources', Icon: LinkIcon },
  social: { labelKey: 'search.groups.social', defaultLabel: 'Social', Icon: Users },
};

const TYPE_ORDER: SearchItemType[] = ['article', 'faq', 'resource', 'social'];

function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

/** Highlight Fuse match indices inside a string using <mark>. */
function highlight(text: string, indices: readonly [number, number][] | undefined) {
  if (!indices || !indices.length) return <>{text}</>;
  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  for (const [start, end] of indices) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end + 1), match: true });
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark
            key={i}
            className="rounded bg-accent-100 px-0.5 text-primary-900 dark:bg-accent-500/30 dark:text-accent-100"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * `<SearchDialog>` — full-screen overlay with a Fuse-backed client-side
 * index over articles, FAQ, resources, and social channels. Navigable via
 * arrow keys; `Enter` commits; `Esc` closes; ⌘/Ctrl+K toggles.
 *
 * Results are grouped by type and keyboard navigation proceeds through the
 * *visible flat order* so that ↑/↓ never lands on a group header.
 */
export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { localizePath } = useLocalizedPath();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Rebuild index whenever locale changes. Also re-build when opened to be
  // safe — build cost is trivial (a few dozen items).
  const fuse = useMemo(() => {
    const items = buildSearchItems(t, i18n);
    return createFuse(items);
  }, [t, i18n, i18n.language, open]);

  const results: FuseResult[] = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query.trim(), { limit: 40 });
  }, [fuse, query]);

  // Group results by type while preserving Fuse score order within each group.
  const grouped = useMemo(() => {
    const byType = new Map<SearchItemType, FuseResult[]>();
    for (const r of results) {
      const list = byType.get(r.item.type) ?? [];
      list.push(r);
      byType.set(r.item.type, list);
    }
    const ordered: Array<{ type: SearchItemType; results: FuseResult[] }> = [];
    for (const type of TYPE_ORDER) {
      const list = byType.get(type);
      if (list && list.length) ordered.push({ type, results: list });
    }
    return ordered;
  }, [results]);

  // Flat visible order for keyboard nav.
  const flat = useMemo(() => grouped.flatMap((g) => g.results), [grouped]);

  // Reset active index when results change.
  useEffect(() => {
    setActive(0);
  }, [query, open]);

  // Focus the input on open; restore scroll lock.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tick = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(tick);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Keep the active item scrolled into view.
  useEffect(() => {
    if (!listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const commit = useCallback(
    (item: SearchItem) => {
      const q = query.trim();
      if (q) {
        const next = [q, ...recent.filter((r) => r !== q)].slice(0, MAX_RECENT);
        setRecent(next);
        writeRecent(next);
      }
      onClose();
      if (item.externalUrl) {
        window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(localizePath(item.to));
      }
    },
    [localizePath, navigate, onClose, query, recent],
  );

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = flat[active];
      if (chosen) commit(chosen.item);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('search.dialogLabel', { defaultValue: 'Search the site' }) as string}
      className="fixed inset-0 z-50 flex items-start justify-center bg-primary-900/60 p-4 pt-[10vh] backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-primary-500/10 dark:bg-primary-800 dark:ring-primary-700/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-primary-500/10 px-4 py-3 dark:border-primary-700/40">
          <Search size={18} aria-hidden="true" className="text-primary-500 dark:text-accent-300" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder', { defaultValue: 'Search articles, FAQ, resources…' }) as string}
            aria-label={t('search.placeholder', { defaultValue: 'Search' }) as string}
            className="flex-1 bg-transparent text-base text-ink placeholder:text-ink/40 focus:outline-none dark:text-paper dark:placeholder:text-paper/40"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('search.close', { defaultValue: 'Close' }) as string}
            className="rounded-md p-1 text-ink/60 hover:bg-primary-50 hover:text-ink dark:text-paper/60 dark:hover:bg-primary-700 dark:hover:text-paper"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-4">
              {recent.length ? (
                <>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/50 dark:text-paper/50">
                    {t('search.recent', { defaultValue: 'Recent searches' }) as string}
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={r}>
                        <button
                          type="button"
                          onClick={() => setQuery(r)}
                          className="rounded-full border border-primary-500/20 px-3 py-1 text-xs text-ink/70 transition-colors hover:border-primary-500/40 hover:bg-primary-50 dark:border-primary-700/60 dark:text-paper/70 dark:hover:bg-primary-700"
                        >
                          {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-center text-sm text-ink/50 dark:text-paper/50">
                  {t('search.empty', { defaultValue: 'Start typing to search.' }) as string}
                </p>
              )}
            </div>
          ) : grouped.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink/50 dark:text-paper/50">
              {t('search.noResults', { defaultValue: 'No results found.' }) as string}
            </p>
          ) : (
            <ul className="space-y-4 p-2">
              {grouped.map((group) => {
                const meta = TYPE_META[group.type];
                const GroupIcon = meta.Icon;
                return (
                  <li key={group.type}>
                    <h3 className="mb-1 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-ink/50 dark:text-paper/50">
                      <GroupIcon size={12} aria-hidden="true" />
                      {t(meta.labelKey, { defaultValue: meta.defaultLabel }) as string}
                    </h3>
                    <ul>
                      {group.results.map((r) => {
                        const flatIndex = flat.indexOf(r);
                        const isActive = flatIndex === active;
                        const titleMatch = r.matches?.find((m) => m.key === 'title');
                        const bodyMatch = r.matches?.find((m) => m.key === 'body');
                        return (
                          <li key={r.item.id}>
                            <button
                              type="button"
                              data-index={flatIndex}
                              onMouseEnter={() => setActive(flatIndex)}
                              onClick={() => commit(r.item)}
                              className={cn(
                                'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-start transition-colors',
                                isActive
                                  ? 'bg-primary-50 dark:bg-primary-700'
                                  : 'hover:bg-primary-50/50 dark:hover:bg-primary-700/50',
                              )}
                            >
                              <span className="mt-1 text-primary-500 dark:text-accent-300">
                                <GroupIcon size={14} aria-hidden="true" />
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="flex items-center gap-1 font-medium text-primary-700 dark:text-accent-300">
                                  <span className="truncate">
                                    {highlight(r.item.title, titleMatch?.indices)}
                                  </span>
                                  {r.item.externalUrl ? (
                                    <ExternalLink
                                      size={12}
                                      aria-hidden="true"
                                      className="shrink-0 text-ink/40 dark:text-paper/40"
                                    />
                                  ) : null}
                                </span>
                                <span className="mt-0.5 line-clamp-1 block text-xs text-ink/60 dark:text-paper/60">
                                  {highlight(r.item.body, bodyMatch?.indices)}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-primary-500/10 px-4 py-2 text-2xs text-ink/50 dark:border-primary-700/40 dark:text-paper/50">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-primary-500/20 bg-paper px-1.5 py-0.5 font-mono dark:border-primary-700/60 dark:bg-primary-900">↑↓</kbd>
            {t('search.hints.navigate', { defaultValue: 'navigate' }) as string}
            <kbd className="rounded border border-primary-500/20 bg-paper px-1.5 py-0.5 font-mono dark:border-primary-700/60 dark:bg-primary-900">↵</kbd>
            {t('search.hints.select', { defaultValue: 'select' }) as string}
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-primary-500/20 bg-paper px-1.5 py-0.5 font-mono dark:border-primary-700/60 dark:bg-primary-900">Esc</kbd>
            {t('search.hints.close', { defaultValue: 'close' }) as string}
          </span>
        </div>
      </div>
    </div>
  );
}
