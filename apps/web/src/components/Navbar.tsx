import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Shield, X } from 'lucide-react';

import Container from './Container';
import LanguageSwitcher from './LanguageSwitcher';
import DarkModeToggle from './DarkModeToggle';
import CommandK from './CommandK';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { cn } from '@/lib/utils';
import * as AuthModule from '@/lib/auth';

const navItems = [
  { to: '/learn', key: 'learn' },
  { to: '/quran', key: 'quran' },
  { to: '/resources', key: 'resources' },
  { to: '/faq', key: 'faq' },
  { to: '/social', key: 'social' },
  { to: '/about', key: 'about' },
] as const;

/**
 * `useAdminLinkVisibility` — returns true only when the signed-in user is an
 * admin. Hooks are called unconditionally (per React rules); presence of the
 * auth API is verified at module-load — if either export is missing we bind
 * to a no-op hook so the component still renders cleanly.
 */
type AuthState = { user: unknown | null };
type AdminState = { isAdmin: boolean };

const noopAuth = (): AuthState => ({ user: null });
const noopAdmin = (): AdminState => ({ isAdmin: false });

const useAuthHook: () => AuthState =
  typeof (AuthModule as { useAuth?: unknown }).useAuth === 'function'
    ? ((AuthModule as { useAuth: () => AuthState }).useAuth as () => AuthState)
    : noopAuth;
const useIsAdminHook: () => AdminState =
  typeof (AuthModule as { useIsAdmin?: unknown }).useIsAdmin === 'function'
    ? ((AuthModule as { useIsAdmin: () => AdminState }).useIsAdmin as () => AdminState)
    : noopAdmin;

function useAdminLinkVisibility(): boolean {
  const auth = useAuthHook();
  const admin = useIsAdminHook();
  return Boolean(auth.user && admin.isAdmin);
}

export default function Navbar() {
  const { t } = useTranslation();
  const { localizePath } = useLocalizedPath();
  const [open, setOpen] = useState(false);
  const showAdminLink = useAdminLinkVisibility();

  return (
    <header className="sticky top-0 z-40 border-b border-primary-500/10 bg-paper/80 backdrop-blur-md dark:border-primary-700/30 dark:bg-primary-900/80">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to={localizePath('/')}
            className="flex items-center gap-2 font-serif text-xl font-semibold text-primary-700 dark:text-accent-300"
          >
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-accent-400" />
            {t('site.name')}
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
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
                {t(`nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <CommandK />
            <DarkModeToggle />
            <LanguageSwitcher />
            {showAdminLink ? (
              <Link
                to="/admin"
                className="hidden lg:inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:text-accent-300 dark:hover:bg-primary-800"
                aria-label={t('navExtras.admin', { defaultValue: 'Admin' }) as string}
              >
                <Shield size={12} aria-hidden="true" />
                {t('navExtras.admin', { defaultValue: 'Admin' }) as string}
              </Link>
            ) : null}
            <Link
              to={localizePath('/contact')}
              className="hidden lg:inline-flex btn-accent !px-4 !py-2 text-sm"
            >
              {t('nav.contact')}
            </Link>
            <button
              type="button"
              className="lg:hidden btn-ghost !px-2 !py-2"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('nav.toggleMenu')}
              aria-expanded={open}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="lg:hidden pb-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
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
                  {t(`nav.${item.key}`)}
                </NavLink>
              ))}
              {showAdminLink ? (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-accent-300 dark:hover:bg-primary-800"
                >
                  <Shield size={14} aria-hidden="true" />
                  {t('navExtras.admin', { defaultValue: 'Admin' }) as string}
                </Link>
              ) : null}
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
