import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Menu, X } from 'lucide-react';

import Container from './Container';
import DarkModeToggle from './DarkModeToggle';
import CommandK from './CommandK';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { cn } from '@/lib/utils';
import { useSiteSetting } from '@/lib/content';
import type { BrandTranslations, NavItem, NavItemsData } from '@/lib/content-schema';

export default function Navbar() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const brand = useSiteSetting<BrandTranslations>('brand', locale);
  const navSetting = useSiteSetting<Record<string, string>>('navItems', locale);

  const siteName = brand.data?.value.siteName ?? t('site.name');

  // Navigation items come from Firestore; fall back to the defaults embedded
  // in the public loader if the doc is missing entirely. We filter hidden
  // items and sort by explicit order so editors can reorder without
  // worrying about array position.
  // Items marked "More" in Admin go into the More menu instead of the bar.
  const { mainItems, moreItems } = useMemo(() => {
    const raw = (navSetting.data?.data as NavItemsData | undefined)?.items ?? [];
    const visible = [...raw]
      .filter((i) => i && typeof i.to === 'string' && i.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      mainItems: visible.filter((i) => i.placement !== 'more'),
      moreItems: visible.filter((i) => i.placement === 'more'),
    };
  }, [navSetting.data]);

  const labelFor = (item: NavItem) => item.labelEn;
  const moreActive = moreItems.some((i) => localizePath(i.to) === pathname);

  // Close the More menu after navigating, on a click outside it, or on Escape.
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMoreOpen(false);
      moreButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  function renderMobileLink(item: NavItem) {
    return (
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
    );
  }

  return (
    <header className="border-primary-500/10 bg-paper/80 dark:border-primary-700/30 dark:bg-primary-900/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to={localizePath('/')} className="flex items-center" aria-label={siteName}>
            <img
              src="/logo.png"
              alt={siteName}
              className="h-10 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
          </Link>

          <nav className="hidden items-center gap-6 xl:flex">
            {mainItems.map((item) => (
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
            {moreItems.length > 0 ? (
              <div ref={moreRef} className="relative">
                <button
                  ref={moreButtonRef}
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  aria-controls="nav-more-menu"
                  className={cn(
                    'inline-flex items-center gap-1 text-sm font-medium transition-colors',
                    moreActive || moreOpen
                      ? 'text-primary-700 dark:text-accent-300'
                      : 'text-ink/70 hover:text-primary-700 dark:text-paper/70 dark:hover:text-accent-300',
                  )}
                >
                  {t('nav.more')}
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={cn('transition-transform', moreOpen && 'rotate-180')}
                  />
                </button>
                {moreOpen ? (
                  <div
                    id="nav-more-menu"
                    className="border-primary-500/10 dark:border-primary-700/40 dark:bg-primary-800 animate-fade-in absolute left-0 top-full mt-3 min-w-[13rem] rounded-xl border bg-white p-2 shadow-lg"
                  >
                    {moreItems.map((item) => (
                      <NavLink
                        key={item.key}
                        to={localizePath(item.to)}
                        end
                        className={({ isActive }) =>
                          cn(
                            'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-700/60 dark:text-accent-300'
                              : 'text-ink/80 hover:bg-primary-50 hover:text-primary-700 dark:text-paper/80 dark:hover:bg-primary-700/60',
                          )
                        }
                      >
                        {labelFor(item)}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="flex items-center gap-2">
            <CommandK />
            <DarkModeToggle />
            <Link
              to={localizePath('/contact')}
              className="btn-accent hidden !px-4 !py-2 text-sm xl:inline-flex"
            >
              {t('nav.contact')}
            </Link>
            <button
              type="button"
              className="btn-ghost !px-2 !py-2 xl:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('nav.toggleMenu')}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="animate-fade-in pb-4 xl:hidden">
            <div className="flex flex-col gap-1">
              {mainItems.map(renderMobileLink)}
              {moreItems.length > 0 ? (
                <>
                  <hr className="border-primary-500/10 dark:border-primary-700/30 my-2" />
                  {moreItems.map(renderMobileLink)}
                </>
              ) : null}
              <Link
                to={localizePath('/contact')}
                onClick={() => setOpen(false)}
                className="btn-accent mt-2 text-sm"
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
