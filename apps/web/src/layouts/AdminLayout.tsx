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
  Activity,
  BookOpen,
  FileText,
  FolderTree,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Notebook,
  Settings,
  Sliders,
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
  { to: '/admin/site', label: 'Site Settings', icon: Sliders },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/activity', label: 'Activity', icon: Activity },
  { to: '/admin/series', label: 'Series', icon: Layers },
  { to: '/admin/topics', label: 'Topics', icon: FolderTree },
  { to: '/admin/pages', label: 'Pages', icon: Notebook },
  { to: '/admin/media', label: 'Media', icon: ImageIcon },
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
      <div className="bg-paper flex min-h-screen items-center justify-center px-6">
        <div className="border-primary-100 max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-primary-700 font-serif text-2xl">Not authorised</h1>
          <p className="text-ink/70 mt-3 text-sm">
            You are signed in as <span className="font-mono">{user.email}</span>, but this account
            is not on the admin allowlist. Ask an existing admin to add your UID to{' '}
            <span className="font-mono">/admins</span>.
          </p>
          <p className="text-ink/60 mt-2 font-mono text-xs">UID: {user.uid}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn bg-primary-500 hover:bg-primary-600 text-white"
            >
              Sign out
            </button>
            <Link to="/" className="text-primary-500 hover:text-primary-600 text-sm">
              Back to site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper flex min-h-screen">
      <aside className="border-primary-100 hidden w-60 shrink-0 flex-col border-r bg-white md:flex">
        <div className="border-primary-100 flex h-16 items-center gap-2 border-b px-5">
          <BookOpen className="text-primary-500 h-5 w-5" />
          <span className="text-primary-700 font-serif text-lg">TSP Admin</span>
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
        <div className="border-primary-100 text-ink/50 border-t p-3 text-xs">
          <Link to="/" className="hover:text-primary-600">
            View public site →
          </Link>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-primary-100 flex h-16 items-center justify-between border-b bg-white px-6">
          <h1 className="text-primary-700 font-serif text-xl">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <span className="text-ink/70 hidden text-sm sm:inline">{user.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="border-primary-100 text-ink/70 hover:border-primary-300 hover:text-primary-700 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
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
