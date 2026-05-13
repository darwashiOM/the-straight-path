import { useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';

import Container from './Container';
import DarkModeToggle from './DarkModeToggle';
import CommandK from './CommandK';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { cn } from '@/lib/utils';
import { useSiteSetting } from '@/lib/content';
import type { BrandData, BrandTranslations, NavItem, NavItemsData } from '@/lib/content-schema';

export default function Navbar() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const [open, setOpen] = useState(false);

  const brand = useSiteSetting<BrandTranslations>('brand', locale);
  const navSetting = useSiteSetting<Record<string, string>>('navItems', locale);

  const siteName = brand.data?.value.siteName ?? t('site.name');
  const logoUrl = ((brand.data?.data as BrandData | undefined)?.logoUrl ?? '').trim();

  // Navigation items come from Firestore; fall back to the defaults embedded
  // in the public loader if the doc is missing entirely. We filter hidden
  // items and sort by explicit order so editors can reorder without
  // worrying about array position.
  const items = useMemo<NavItem[]>(() => {
    const raw = (navSetting.data?.data as NavItemsData | undefined)?.items ?? [];
    return [...raw]
      .filter((i) => i && typeof i.to === 'string' && i.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [navSetting.data]);

  const labelFor = (item: NavItem) =>
    locale === 'ar' ? item.labelAr || item.labelEn : item.labelEn;

  return (
    <header className="sticky top-0 z-40 border-b border-primary-500/10 bg-paper/80 backdrop-blur-md dark:border-primary-700/30 dark:bg-primary-900/80">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to={localizePath('/')}
            className="flex items-center gap-2 font-serif text-xl font-semibold text-primary-700 dark:text-accent-300"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="h-8 w-auto object-contain"
                loading="eager"
                decoding="async"
              />
            ) : (
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-accent-400" />
            )}
            {siteName}
          </Link>

          <nav className="hidden xl:flex items-center gap-6">
            {items.map((item) => (
              <NavLink
                key={item.key}
                to={localizePath(item.to)}
                end
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium transition-colors',
                    isActive
                      ? 'text-primary-700 dark:text-accent-300'
                      : 'text-ink/70 hover:text-primary-700 dark:text-paper/70 dark:hover:text-accent-300',
                  )
                }
              >
                {labelFor(item)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <CommandK />
            <DarkModeToggle />
            <Link
              to={localizePath('/contact')}
              className="hidden xl:inline-flex btn-accent !px-4 !py-2 text-sm"
            >
              {t('nav.contact')}
            </Link>
            <button
              type="button"
              className="xl:hidden btn-ghost !px-2 !py-2"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('nav.toggleMenu')}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="xl:hidden pb-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.key}
                  to={localizePath(item.to)}
                  end
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium',
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-800 dark:text-accent-300'
                        : 'text-ink/80 hover:bg-primary-50 dark:text-paper/80 dark:hover:bg-primary-800',
                    )
                  }
                >
                  {labelFor(item)}
                </NavLink>
              ))}
              <Link
                to={localizePath('/contact')}
                onClick={() => setOpen(false)}
                className="mt-2 btn-accent text-sm"
              >
                {t('nav.contact')}
              </Link>
            </div>
          </nav>
        ) : null}
      </Container>
    </header>
  );
}
