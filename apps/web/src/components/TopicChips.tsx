import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * The canonical set of topic chips shown on Learn + Articles index.
 *
 * The sentinel value `'all'` is the "no filter" selection. Adding a new chip
 * is a two-line change: append it here and add its label key to
 * `learn.topics.<slug>` in both locale files.
 */
export const TOPICS = [
  'all',
  'foundations',
  'creed',
  'quran',
  'prophet',
  'character',
  'practice',
  'comparative-religion',
] as const;

export type TopicSlug = (typeof TOPICS)[number];

export interface TopicChipsProps {
  /** The currently-selected topic, or `'all'` when unfiltered. */
  value: TopicSlug;
  /** Called with the new value when a chip is pressed. */
  onChange: (next: TopicSlug) => void;
  /** Topics that have at least one article; other chips are hidden. The
   *  active chip always stays so a shared `?topic=` link still shows it. */
  available: ReadonlySet<string>;
  /** Optional extra wrapper classes. */
  className?: string;
}

export default function TopicChips({ value, onChange, available, className }: TopicChipsProps) {
  const { t } = useTranslation();
  const shown = TOPICS.filter(
    (topic) => topic === 'all' || topic === value || available.has(topic),
  );

  // "All" on its own filters nothing, so the row only appears once there is
  // a topic to choose.
  if (shown.length < 2) return null;

  return (
    // A plain scroll container — keeps the chip row usable on narrow phones
    // without pushing the page horizontally.
    <div
      role="group"
      aria-label={t('learn.topics.ariaLabel')}
      className={cn('-mx-1 flex flex-wrap gap-2 px-1', className)}
    >
      {shown.map((topic) => {
        const active = value === topic;
        return (
          <button
            key={topic}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(topic)}
            className={cn(
              'focus-visible:outline-accent-400 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              active
                ? 'border-primary-600 bg-primary-600 dark:border-accent-400 dark:bg-accent-400 dark:text-primary-900 text-white shadow-sm'
                : 'border-primary-500/20 text-ink/80 hover:border-primary-500/40 hover:bg-primary-50 dark:border-primary-700/60 dark:bg-primary-800 dark:text-paper/80 dark:hover:bg-primary-700/60 bg-white',
            )}
          >
            {t(`learn.topics.${topic}`)}
          </button>
        );
      })}
    </div>
  );
}
