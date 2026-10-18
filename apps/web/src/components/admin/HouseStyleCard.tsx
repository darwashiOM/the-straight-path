import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Search, Wand2 } from 'lucide-react';

import { recordAudit } from '@/lib/audit';
import { useAuth } from '@/lib/auth';
import { getDb } from '@/lib/firebase';
import { HOUSE_STYLE_COLLECTIONS, HOUSE_STYLE_RULES, fixValue } from '@/lib/house-style';

interface PendingFix {
  collection: string;
  id: string;
  count: number;
  /** Only the top-level fields that change. */
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

async function findFixes(): Promise<PendingFix[]> {
  const db = getDb();
  const out: PendingFix[] = [];
  for (const name of HOUSE_STYLE_COLLECTIONS) {
    const snap = await getDocs(collection(db, name));
    for (const d of snap.docs) {
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      let count = 0;
      for (const [key, value] of Object.entries(d.data())) {
        const fixed = fixValue(value);
        if (fixed.count === 0) continue;
        before[key] = value;
        after[key] = fixed.value;
        count += fixed.count;
      }
      if (count > 0) out.push({ collection: name, id: d.id, count, before, after });
    }
  }
  return out;
}

/**
 * `HouseStyleCard` — scans every content collection for spellings that
 * break the house style and fixes them in one go. Each changed document
 * gets an audit entry, so the Activity page shows what changed.
 */
export default function HouseStyleCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [fixes, setFixes] = useState<PendingFix[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [fixedCount, setFixedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = (fixes ?? []).reduce((n, f) => n + f.count, 0);
  const rules = HOUSE_STYLE_RULES.map((r) => r.label).join(', ');

  async function check() {
    setBusy(true);
    setError(null);
    setFixedCount(null);
    try {
      setFixes(await findFixes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setBusy(false);
    }
  }

  async function fixAll() {
    if (!fixes || fixes.length === 0) return;
    setBusy(true);
    setError(null);
    let applied = 0;
    try {
      for (const f of fixes) {
        await updateDoc(doc(getDb(), f.collection, f.id), {
          ...f.after,
          updatedAt: serverTimestamp(),
        });
        await recordAudit({
          uid: user?.uid ?? '',
          email: user?.email ?? '',
          action: 'update',
          collection: f.collection,
          docId: f.id,
          before: f.before,
          after: f.after,
        });
        applied += f.count;
      }
      setFixedCount(applied);
      setFixes([]);
      await qc.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fix failed');
      setFixes(await findFixes().catch(() => fixes));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-primary-700 font-serif text-lg">House style</h2>
      <p className="text-ink/70 mt-2 text-sm">
        Finds spellings that break the house style in all stored content (articles, FAQs, pages,
        Site Settings, and the rest) and fixes them. Spellings checked: {rules}.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void check()}
          disabled={busy}
          className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {busy && fixes === null ? 'Checking…' : 'Check content'}
        </button>
        {fixes && fixes.length > 0 ? (
          <button
            type="button"
            onClick={() => void fixAll()}
            disabled={busy}
            className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Wand2 className="h-4 w-4" />
            {busy ? 'Fixing…' : `Fix ${total} ${total === 1 ? 'spelling' : 'spellings'}`}
          </button>
        ) : null}
      </div>

      {fixes && fixes.length > 0 ? (
        <ul className="border-primary-100 divide-primary-100 mt-4 divide-y rounded-lg border text-sm">
          {fixes.map((f) => (
            <li key={`${f.collection}/${f.id}`} className="flex justify-between gap-3 px-3 py-2">
              <span className="text-ink/80 font-mono text-xs">
                {f.collection} / {f.id}
              </span>
              <span className="text-ink/60 text-xs">{f.count}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {fixes && fixes.length === 0 ? (
        <p className="text-sage mt-4 inline-flex items-center gap-1 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          {fixedCount !== null
            ? `Fixed ${fixedCount} ${fixedCount === 1 ? 'spelling' : 'spellings'}. Each change is listed under Activity.`
            : 'Everything matches the house style.'}
        </p>
      ) : null}

      {error ? (
        <div className="border-sienna/30 bg-sienna/5 text-sienna mt-4 rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}
    </section>
  );
}
