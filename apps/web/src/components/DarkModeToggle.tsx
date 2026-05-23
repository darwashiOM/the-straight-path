import { Laptop, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme, type ThemeMode } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface DarkModeToggleProps {
  className?: string;
}

/**
 * `<DarkModeToggle>` — a three-state color-scheme cycle button
 * (light → dark → system → light …).
 *
 * Renders the icon of the *current* mode so the user sees their selection;
 * the tooltip / aria-label describes the *next* action for clarity. The
 * button wraps a visually-hidden polite live region so screen readers
 * announce the new mode on each press.
 */
export default function DarkModeToggle({ className }: DarkModeToggleProps) {
  const { t } = useTranslation();
  const { mode, cycle } = useTheme();

  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Laptop;
  const nextMode: ThemeMode = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';

  const label = t(`theme.current.${mode}`, {
    defaultValue: mode === 'light' ? 'Light mode' : mode === 'dark' ? 'Dark mode' : 'System theme',
  }) as string;
  const nextLabel = t(`theme.switchTo.${nextMode}`, {
    defaultValue:
      nextMode === 'light'
        ? 'Switch to light mode'
        : nextMode === 'dark'
          ? 'Switch to dark mode'
          : 'Use system theme',
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
