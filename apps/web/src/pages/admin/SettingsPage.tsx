import { type FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Trash2, UserPlus } from 'lucide-react';

import { addAdmin, listAdmins, removeAdmin } from '@/lib/admin-firestore';
import { useAuth } from '@/lib/auth';

const AUTH_CONSOLE_URL = 'https://console.firebase.google.com/project/_/authentication/users';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'admins'], queryFn: listAdmins });

  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addMut = useMutation({
    mutationFn: () => addAdmin(uid.trim(), email.trim(), displayName.trim() || undefined),
    onSuccess: async () => {
      setUid('');
      setEmail('');
      setDisplayName('');
      await qc.invalidateQueries({ queryKey: ['admin', 'admins'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to add admin'),
  });
  const removeMut = useMutation({
    mutationFn: (uidToRemove: string) => removeAdmin(uidToRemove),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'admins'] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[A-Za-z0-9]{10,}$/.test(uid.trim())) {
      setError('UID looks wrong. Copy it from the Firebase Auth console.');
      return;
    }
    addMut.mutate();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg text-primary-700">Admin allowlist</h2>
        <p className="mt-2 text-sm text-ink/70">
          Anyone on this list can sign in and edit content. Firestore rules use this
          collection as the source of truth. To add someone, create their Email/Password
          user in the Firebase Auth console, copy their UID, then paste it below.
        </p>
        <a
          href={AUTH_CONSOLE_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          Open Firebase Auth console
          <ExternalLink className="h-3 w-3" />
        </a>
      </section>

      <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-serif text-base text-primary-700">Current admins</h3>
        <div className="overflow-hidden rounded-lg border border-primary-100">
          <table className="w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-primary-700">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Display name</th>
                <th className="px-4 py-2">UID</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink/50">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && (data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink/50">
                    No admins configured.
                  </td>
                </tr>
              )}
              {(data ?? []).map((a) => {
                const isSelf = user && user.uid === a.uid;
                return (
                  <tr key={a.uid}>
                    <td className="px-4 py-2 text-ink/80">
                      {a.email}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ink/70">{a.displayName ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-ink/60">{a.uid}</td>
                    <td className="px-4 py-2 text-right">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove ${a.email} from admins?`))
                              removeMut.mutate(a.uid);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-sienna hover:text-sienna/80"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-serif text-base text-primary-700">Add an admin</h3>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-3">
            <span className="block text-sm font-medium text-ink/80">Firebase Auth UID</span>
            <input
              type="text"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              required
              placeholder="abc123… (copy from Firebase Auth console)"
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 font-mono text-xs focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="block text-sm font-medium text-ink/80">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-ink/80">Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </label>
          {error && (
            <div
              role="alert"
              className="sm:col-span-3 rounded-lg border border-sienna/30 bg-sienna/5 px-3 py-2 text-sm text-sienna"
            >
              {error}
            </div>
          )}
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={addMut.isPending}
              className="btn bg-primary-500 text-white hover:bg-primary-600"
            >
              <UserPlus className="h-4 w-4" />
              {addMut.isPending ? 'Adding…' : 'Add admin'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
