/**
 * LocaleTabs — minimal two-tab (EN / AR) switcher used by the admin editors.
 *
 * It is a controlled component: the caller owns the active locale. The
 * component only renders the tab strip and the slot for the currently
 * selected pane; callers render the panes themselves so they can hold
 * independent form state without re-mounts.
 */
import type { ReactNode } from 'react';

import type { Locale } from '@/lib/content-schema';

interface Props {
  locale: Locale;
  onChange: (locale: Locale) => void;
  /** Optional badges (e.g. "missing", a character count) shown next to tabs. */
  enBadge?: ReactNode;
  arBadge?: ReactNode;
  className?: string;
}

const TABS: Array<{ id: Locale; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'Arabic' },
];

export default function LocaleTabs({ locale, onChange, enBadge, arBadge, className }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Translation locale"
      className={
        'inline-flex items-center gap-1 rounded-lg border border-primary-100 bg-white p-1 ' +
        (className ?? '')
      }
    >
      {TABS.map((tab) => {
        const active = tab.id === locale;
        const badge = tab.id === 'en' ? enBadge : arBadge;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ' +
              (active
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-ink/70 hover:bg-primary-50 hover:text-primary-700')
            }
          >
            {tab.label}
            {badge ? <span className="text-xs opacity-80">{badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
