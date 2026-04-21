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
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim() || msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-xl border border-primary-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary-500" />
          <span className="font-serif text-lg text-primary-700">TSP Admin</span>
        </div>
        <h1 className="mb-1 font-serif text-2xl text-primary-700">Sign in</h1>
        <p className="mb-6 text-sm text-ink/60">
          For editors on the allowlist. If you need access, contact an existing admin.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium text-ink/80">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-ink/80">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-sienna/30 bg-sienna/5 px-3 py-2 text-sm text-sienna"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn w-full bg-primary-500 text-white hover:bg-primary-600"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
