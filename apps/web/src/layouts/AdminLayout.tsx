/**
 * AdminLayout — the shell for every page under `/admin/*`.
 *
 * Responsibilities:
 *   1. Gate access. Redirects unauth'd users to /admin/login; shows a
 *      "not authorised" screen for authed users missing from /admins.
 *   2. Chrome. Left sidebar nav + header with signed-in email + sign out.
 *   3. English-only. Deliberately NOT wrapped in i18n.
 */
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import {
  BookOpen,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Settings,
  Tv,
} from 'lucide-react';

import { signOut, useAuth, useIsAdmin } from '@/lib/auth';
import LoadingScreen from '@/components/LoadingScreen';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/articles', label: 'Articles', icon: FileText },
  { to: '/admin/resources', label: 'Resources', icon: LinkIcon },
  { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/admin/channels', label: 'Channels', icon: Tv },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const location = useLocation();

  const loading = authLoading || (user && adminLoading);

  // Always-stable title derivation.
  const pageTitle = useMemo(() => {
    const match = NAV.find((n) =>
      n.end ? location.pathname === n.to : location.pathname.startsWith(n.to),
    );
    return match?.label ?? 'Admin';
  }, [location.pathname]);

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md rounded-xl border border-primary-100 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl text-primary-700">Not authorised</h1>
          <p className="mt-3 text-sm text-ink/70">
            You are signed in as <span className="font-mono">{user.email}</span>, but this account
            is not on the admin allowlist. Ask an existing admin to add your UID to{' '}
            <span className="font-mono">/admins</span>.
          </p>
          <p className="mt-2 font-mono text-xs text-ink/60">UID: {user.uid}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn bg-primary-500 text-white hover:bg-primary-600"
            >
              Sign out
            </button>
            <Link to="/" className="text-sm text-primary-500 hover:text-primary-600">
              Back to site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-primary-100 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-primary-100 px-5">
          <BookOpen className="h-5 w-5 text-primary-500" />
          <span className="font-serif text-lg text-primary-700">TSP Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-ink/70 hover:bg-primary-50/50 hover:text-primary-700'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-primary-100 p-3 text-xs text-ink/50">
          <Link to="/" className="hover:text-primary-600">
            View public site →
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-primary-100 bg-white px-6">
          <h1 className="font-serif text-xl text-primary-700">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-ink/70 sm:inline">{user.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-100 px-3 py-1.5 text-sm text-ink/70 hover:border-primary-300 hover:text-primary-700"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
