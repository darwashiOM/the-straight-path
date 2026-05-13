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
import {
  BookOpen,
  ExternalLink,
  HelpCircle,
  Link as LinkIcon,
  Search,
  Users,
  X,
} from 'lucide-react';
import type Fuse from 'fuse.js';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import {
  buildSearchItemsAsync,
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

const TYPE_META: Record<
  SearchItemType,
  { labelKey: string; defaultLabel: string; Icon: typeof BookOpen }
> = {
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
            className="bg-accent-100 text-primary-900 dark:bg-accent-500/30 dark:text-accent-100 rounded px-0.5"
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { localizePath, locale } = useLocalizedPath();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const [fuse, setFuse] = useState<Fuse<SearchItem> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build the Fuse index from Firestore content whenever the dialog is opened
  // or the locale changes. Results are asynchronous, so the first keystroke
  // after open may see an empty list for a tick — this is fine: the cost is
  // roughly a single getDocs round-trip.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void buildSearchItemsAsync(locale).then((items) => {
      if (cancelled) return;
      setFuse(createFuse(items));
    });
    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  const results: FuseResult[] = useMemo(() => {
    if (!query.trim() || !fuse) return [];
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
      className="bg-primary-900/60 animate-fade-in fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ring-primary-500/10 dark:bg-primary-800 dark:ring-primary-700/40 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-lg ring-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-primary-500/10 dark:border-primary-700/40 flex items-center gap-3 border-b px-4 py-3">
          <Search size={18} aria-hidden="true" className="text-primary-500 dark:text-accent-300" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              t('search.placeholder', {
                defaultValue: 'Search articles, FAQ, resources…',
              }) as string
            }
            aria-label={t('search.placeholder', { defaultValue: 'Search' }) as string}
            className="text-ink placeholder:text-ink/40 dark:text-paper dark:placeholder:text-paper/40 flex-1 bg-transparent text-base focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('search.close', { defaultValue: 'Close' }) as string}
            className="text-ink/60 hover:bg-primary-50 hover:text-ink dark:text-paper/60 dark:hover:bg-primary-700 dark:hover:text-paper rounded-md p-1"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-4">
              {recent.length ? (
                <>
                  <h3 className="text-ink/50 dark:text-paper/50 mb-2 text-xs font-semibold uppercase tracking-wider">
                    {t('search.recent', { defaultValue: 'Recent searches' }) as string}
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={r}>
                        <button
                          type="button"
                          onClick={() => setQuery(r)}
                          className="border-primary-500/20 text-ink/70 hover:border-primary-500/40 hover:bg-primary-50 dark:border-primary-700/60 dark:text-paper/70 dark:hover:bg-primary-700 rounded-full border px-3 py-1 text-xs transition-colors"
                        >
                          {r}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-ink/50 dark:text-paper/50 text-center text-sm">
                  {t('search.empty', { defaultValue: 'Start typing to search.' }) as string}
                </p>
              )}
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-ink/50 dark:text-paper/50 p-6 text-center text-sm">
              {t('search.noResults', { defaultValue: 'No results found.' }) as string}
            </p>
          ) : (
            <ul className="space-y-4 p-2">
              {grouped.map((group) => {
                const meta = TYPE_META[group.type];
                const GroupIcon = meta.Icon;
                return (
                  <li key={group.type}>
                    <h3 className="text-ink/50 dark:text-paper/50 mb-1 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider">
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
                              <span className="text-primary-500 dark:text-accent-300 mt-1">
                                <GroupIcon size={14} aria-hidden="true" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="text-primary-700 dark:text-accent-300 flex items-center gap-1 font-medium">
                                  <span className="truncate">
                                    {highlight(r.item.title, titleMatch?.indices)}
                                  </span>
                                  {r.item.externalUrl ? (
                                    <ExternalLink
                                      size={12}
                                      aria-hidden="true"
                                      className="text-ink/40 dark:text-paper/40 shrink-0"
                                    />
                                  ) : null}
                                </span>
                                <span className="text-ink/60 dark:text-paper/60 mt-0.5 line-clamp-1 block text-xs">
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

        <div className="border-primary-500/10 text-2xs text-ink/50 dark:border-primary-700/40 dark:text-paper/50 flex items-center justify-between border-t px-4 py-2">
          <span className="flex items-center gap-2">
            <kbd className="border-primary-500/20 bg-paper dark:border-primary-700/60 dark:bg-primary-900 rounded border px-1.5 py-0.5 font-mono">
              ↑↓
            </kbd>
            {t('search.hints.navigate', { defaultValue: 'navigate' }) as string}
            <kbd className="border-primary-500/20 bg-paper dark:border-primary-700/60 dark:bg-primary-900 rounded border px-1.5 py-0.5 font-mono">
              ↵
            </kbd>
            {t('search.hints.select', { defaultValue: 'select' }) as string}
          </span>
          <span className="flex items-center gap-2">
            <kbd className="border-primary-500/20 bg-paper dark:border-primary-700/60 dark:bg-primary-900 rounded border px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
            {t('search.hints.close', { defaultValue: 'close' }) as string}
          </span>
        </div>
      </div>
    </div>
  );
}
