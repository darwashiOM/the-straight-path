import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface DarkModeToggleProps {
  className?: string;
}

/**
 * `<DarkModeToggle>` — a two-state light/dark switch.
 *
 * Shows the icon of the theme currently on screen (sun in light mode, moon in
 * dark mode); the tooltip / aria-label names the *next* action. A visitor who
 * has never pressed it follows their OS theme until the first press. The
 * button wraps a visually-hidden polite live region so screen readers
 * announce the new mode on each press.
 */
export default function DarkModeToggle({ className }: DarkModeToggleProps) {
  const { t } = useTranslation();
  const { resolved, cycle } = useTheme();

  const Icon = resolved === 'dark' ? Moon : Sun;
  const nextMode = resolved === 'dark' ? 'light' : 'dark';

  const label = t(`theme.current.${resolved}`, {
    defaultValue: resolved === 'dark' ? 'Dark mode' : 'Light mode',
  }) as string;
  const nextLabel = t(`theme.switchTo.${nextMode}`, {
    defaultValue: nextMode === 'dark' ? 'Switch to dark mode' : 'Switch to light mode',
  }) as string;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn('btn-ghost !px-2 !py-2', className)}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only" aria-live="polite">
        {label}
      </span>
    </button>
  );
}
