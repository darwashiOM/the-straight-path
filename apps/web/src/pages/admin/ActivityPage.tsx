/**
 * ActivityPage — `/admin/activity`
 *
 * Read-only view of the most recent 200 entries in `/auditLog`,
 * newest first. Rows expand to show a side-by-side `before`/`after`
 * JSON snapshot so reviewers can see exactly what changed.
 *
 * Filters (client-side, applied to the fetched page):
 *   - Collection: dropdown of distinct values present in the fetched
 *     entries.
 *   - uid / email: free-text, case-insensitive substring match.
 *
 * The query is intentionally simple — a single `orderBy('at', 'desc')`
 * with `limit(200)`. No pagination beyond that today; the audit log is
 * low-volume and 200 entries is plenty for operational review. If
 * volume grows, swap in a cursor-based `startAfter` pager.
 */
import { Fragment, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { ChevronDown, ChevronRight, RefreshCw, Undo2 } from 'lucide-react';

import { getDb } from '@/lib/firebase';
import type { AuditLogDoc } from '@/lib/content-schema';
import { restoreSnapshot } from '@/lib/admin-firestore';

interface AuditRow extends AuditLogDoc {
  id: string;
}

async function fetchAuditLog(): Promise<AuditRow[]> {
  const q = query(collection(getDb(), 'auditLog'), orderBy('at', 'desc'), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AuditLogDoc) }));
}

function formatWhen(ts: Timestamp | undefined): string {
  if (!ts) return '—';
  try {
    const d = ts.toDate();
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '—';
  }
}

function ActionBadge({ action }: { action: AuditLogDoc['action'] }) {
  const styles: Record<AuditLogDoc['action'], string> = {
    create: 'bg-sage/10 text-sage',
    update: 'bg-primary-100 text-primary-700',
    delete: 'bg-sienna/10 text-sienna',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[action]}`}
    >
      {action}
    </span>
  );
}

function DiffBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/60">
        {label}
      </div>
      <pre className="max-h-80 overflow-auto rounded-md border border-primary-100 bg-paper p-3 font-mono text-xs leading-relaxed text-ink/80">
        {value === undefined ? '(none)' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function ActivityPage() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['admin', 'auditLog'],
    queryFn: fetchAuditLog,
    staleTime: 30_000,
  });

  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [whoFilter, setWhoFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reverting, setReverting] = useState<string | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  async function revert(row: AuditRow) {
    if (!row.before) {
      setRevertError('This entry has no "before" snapshot to restore.');
      return;
    }
    const msg =
      row.action === 'delete'
        ? `Recreate ${row.collection}/${row.docId} from this snapshot?`
        : `Revert ${row.collection}/${row.docId} to this snapshot? The current state will be replaced.`;
    if (!window.confirm(msg)) return;
    setReverting(row.id);
    setRevertError(null);
    try {
      await restoreSnapshot(row.collection, row.docId, row.before);
      // Invalidate all content + the audit log itself so the restored state
      // and the new audit entry both land immediately.
      await qc.invalidateQueries();
    } catch (err) {
      setRevertError((err as Error).message);
    } finally {
      setReverting(null);
    }
  }

  const collectionOptions = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => set.add(r.collection));
    return Array.from(set).sort();
  }, [data]);

  const rows = useMemo(() => {
    const who = whoFilter.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (collectionFilter && r.collection !== collectionFilter) return false;
      if (who) {
        const hay = `${r.uid} ${r.email}`.toLowerCase();
        if (!hay.includes(who)) return false;
      }
      return true;
    });
  }, [data, collectionFilter, whoFilter]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-ink/70">
          The last {data?.length ?? 0} admin writes, newest first. Click a row to expand the
          before / after snapshot.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-lg border border-primary-100 px-3 py-1.5 text-sm text-ink/70 hover:border-primary-300 hover:text-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-100 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <span>Collection</span>
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="rounded-md border border-primary-100 bg-white px-2 py-1 text-sm focus:border-primary-300 focus:outline-none"
          >
            <option value="">All</option>
            {collectionOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 items-center gap-2 text-sm text-ink/70">
          <span>Who</span>
          <input
            type="text"
            value={whoFilter}
            onChange={(e) => setWhoFilter(e.target.value)}
            placeholder="uid or email substring"
            className="w-full max-w-sm rounded-md border border-primary-100 bg-white px-2 py-1 text-sm focus:border-primary-300 focus:outline-none"
          />
        </label>
        {(collectionFilter || whoFilter) && (
          <button
            type="button"
            onClick={() => {
              setCollectionFilter('');
              setWhoFilter('');
            }}
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-sienna/30 bg-sienna/5 p-4 text-sm text-sienna">
          Failed to load audit log: {(error as Error).message}
        </div>
      ) : null}
      {revertError ? (
        <div className="rounded-xl border border-sienna/30 bg-sienna/5 p-4 text-sm text-sienna">
          Revert failed: {revertError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-primary-700">
            <tr>
              <th className="w-6 px-2 py-3"></th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Doc ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/50">
                  No audit entries match these filters.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => toggle(r.id)}
                    className="cursor-pointer hover:bg-primary-50/30"
                  >
                    <td className="px-2 py-3 text-ink/40">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink/70">
                      {formatWhen(r.at)}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      <div className="font-medium">{r.email || '(no email)'}</div>
                      <div className="font-mono text-xs text-ink/50">{r.uid}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={r.action} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">{r.collection}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">{r.docId}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-paper/40">
                      <td></td>
                      <td colSpan={5} className="px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <div className="text-xs text-ink/60">
                            {r.before
                              ? 'You can restore the "before" snapshot below.'
                              : '(No "before" snapshot — this was a new create.)'}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void revert(r);
                            }}
                            disabled={!r.before || reverting === r.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-accent-400 bg-accent-50 px-3 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            {reverting === r.id ? 'Reverting…' : 'Revert to "Before"'}
                          </button>
                        </div>
                        <div className="flex flex-col gap-4 md:flex-row">
                          <DiffBlock label="Before" value={r.before} />
                          <DiffBlock label="After" value={r.after} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
