import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  /** When true, the button renders compact (icon + code). When false, full label. */
  compact?: boolean;
}

const LOCALE_LABELS: Record<Locale, { short: string; long: string }> = {
  en: { short: 'EN', long: 'English' },
  ar: { short: 'ع', long: 'العربية' },
};

/**
 * `<LanguageSwitcher>` — toggles between supported locales while preserving
 * the current path (`/learn/articles/foo` ↔ `/ar/learn/articles/foo`).
 *
 * Uses a real <Link> so it is:
 *  - crawlable (search engines follow the alternate),
 *  - middle-clickable (open the other language in a new tab),
 *  - keyboard-accessible as a link.
 */
export default function LanguageSwitcher({ className, compact = true }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const { locale, pathForLocale } = useLocalizedPath();

  const target: Locale = locale === 'ar' ? 'en' : 'ar';
  const href = pathForLocale(target);

  // Pre-change i18n on click so the new locale strings are ready before the
  // route transition completes. The route-driven effect in App will reconcile
  // if anything slips through.
  const handleClick = useCallback(() => {
    if (i18n.language !== target) void i18n.changeLanguage(target);
  }, [i18n, target]);

  const label = LOCALE_LABELS[target];

  return (
    <Link
      to={href}
      onClick={handleClick}
      className={cn('btn-ghost !px-3 !py-2', className)}
      aria-label={t('nav.switchLanguage')}
      hrefLang={target}
      lang={target}
    >
      <Globe size={16} aria-hidden="true" />
      <span className="text-xs font-semibold uppercase">{compact ? label.short : label.long}</span>
    </Link>
  );
}
