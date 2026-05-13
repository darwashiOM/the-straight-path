import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * `<Breadcrumbs>` — a small, unobtrusive trail of links.
 *
 * Conventions:
 *  - The final item is never a link (it is the current page).
 *  - If the active locale is RTL (Arabic), separators flip to `<ChevronLeft>`
 *    so arrows point in the reading direction.
 *  - The component is presentational only — parent pages pass the full
 *    `items` array, optionally built from `buildBreadcrumbs` in `routes.ts`.
 */
export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { i18n, t } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  if (!items.length) return null;

  return (
    <nav
      aria-label={t('breadcrumbs.label', { defaultValue: 'Breadcrumb' }) as string}
      className={cn('mb-6 text-sm', className)}
    >
      <ol className="text-ink/60 dark:text-paper/60 flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="flex items-center">
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="hover:text-primary-700 focus-visible:outline-accent-400 dark:hover:text-accent-300 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn(isLast && 'text-ink/80 dark:text-paper/80 font-medium')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden="true" className="flex items-center">
                  <Chevron size={14} className="text-ink/30 dark:text-paper/30" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
