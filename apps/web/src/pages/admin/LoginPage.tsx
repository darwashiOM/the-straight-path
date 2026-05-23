import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

import { signIn, useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? '/admin'} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(
        msg
          .replace('Firebase: ', '')
          .replace(/\(auth\/[^)]+\)\.?/, '')
          .trim() || msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-paper flex min-h-screen items-center justify-center px-4">
      <div className="border-primary-100 w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="text-primary-500 h-5 w-5" />
          <span className="text-primary-700 font-serif text-lg">TSP Admin</span>
        </div>
        <h1 className="text-primary-700 mb-1 font-serif text-2xl">Sign in</h1>
        <p className="text-ink/60 mb-6 text-sm">
          For editors on the allowlist. If you need access, contact an existing admin.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-ink/80 block text-sm font-medium">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-primary-100 focus:border-primary-400 focus:ring-primary-400 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1"
            />
          </label>
          <label className="block">
            <span className="text-ink/80 block text-sm font-medium">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-primary-100 focus:border-primary-400 focus:ring-primary-400 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1"
            />
          </label>
          {error && (
            <div
              role="alert"
              className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn bg-primary-500 hover:bg-primary-600 w-full text-white"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
