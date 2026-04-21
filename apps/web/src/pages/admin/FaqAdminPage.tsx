/**
 * FaqAdminPage — catalog editor for the FAQ collection.
 *
 * Mirrors ResourcesAdminPage: ordered table with up/down swaps, quick-add
 * row, and a side-by-side en/ar editor dialog. The answer field supports
 * markdown with a live rendered preview beneath each locale column.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';

import AdminDialog from '@/components/admin/AdminDialog';
import LocalePanes, { type LocaleFieldKey } from '@/components/admin/LocalePanes';
import MarkdownPreview from '@/components/admin/MarkdownPreview';
import {
  type FaqRecord,
  deleteFaqV2,
  listFaqsV2,
  saveFaqV2,
} from '@/lib/admin-catalog';
import type { FaqDoc } from '@/lib/content-schema';

const CATEGORIES = ['general'] as const;

const LOCALE_KEYS: LocaleFieldKey<'question' | 'answer'>[] = [
  { key: 'question', label: 'Question' },
  { key: 'answer', label: 'Answer (markdown)', multiline: true, rows: 6 },
];

const QK = ['admin', 'faqs', 'v2'] as const;

function emptyDoc(): FaqDoc {
  return {
    category: 'general',
    order: 10,
    translations: { en: { question: '', answer: '' } },
    schemaVersion: 1,
  };
}

export default function FaqAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: QK, queryFn: listFaqsV2 });
  const rows = useMemo(
    () => (data ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [data],
  );

  const [editing, setEditing] = useState<FaqRecord | { draft: FaqDoc } | null>(null);

  const saveMut = useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: FaqDoc }) => saveFaqV2(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFaqV2(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  async function swap(a: FaqRecord, b: FaqRecord) {
    const aDoc: FaqDoc = stripRecord({ ...a, order: b.order });
    const bDoc: FaqDoc = stripRecord({ ...b, order: a.order });
    await Promise.all([saveFaqV2(a.id, aDoc), saveFaqV2(b.id, bDoc)]);
    qc.invalidateQueries({ queryKey: QK });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-primary-700">FAQ</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-primary-700">
            <tr>
              <th className="w-16 px-3 py-3">Order</th>
              <th className="px-3 py-3">EN Question</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">AR Question</th>
              <th className="w-40 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-100">
            <QuickAddRow
              onCreate={async (partial) => {
                const doc: FaqDoc = {
                  ...emptyDoc(),
                  category: partial.category,
                  translations: { en: { question: partial.question, answer: '' } },
                  order: (rows.at(-1)?.order ?? 0) + 10,
                };
                const id = await saveMut.mutateAsync({ id: null, data: doc });
                setEditing({ id, ...doc } as FaqRecord);
              }}
            />
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                  No FAQs yet.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id} className="hover:bg-primary-50/30">
                <td className="px-3 py-3 align-top text-ink/80">
                  <div className="flex items-center gap-1">
                    <span className="w-6 tabular-nums">{row.order}</span>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => {
                        const prev = rows[i - 1];
                        if (prev) void swap(row, prev);
                      }}
                      className="rounded p-1 text-ink/50 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={i === rows.length - 1}
                      onClick={() => {
                        const next = rows[i + 1];
                        if (next) void swap(row, next);
                      }}
                      className="rounded p-1 text-ink/50 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-ink/90">
                  {row.translations.en.question || <span className="text-ink/40">—</span>}
                </td>
                <td className="px-3 py-3 align-top text-ink/70">{row.category}</td>
                <td className="px-3 py-3 align-top text-ink/80" dir="rtl">
                  {row.translations.ar?.question || <span className="text-ink/40" dir="ltr">—</span>}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this FAQ?')) deleteMut.mutate(row.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-sienna hover:text-sienna/80"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <FaqEditor
          initial={'draft' in editing ? editing.draft : stripRecord(editing)}
          initialId={'draft' in editing ? null : editing.id}
          onClose={() => setEditing(null)}
          onSave={async (id, doc) => {
            await saveMut.mutateAsync({ id, data: doc });
            setEditing(null);
          }}
          onDelete={
            'draft' in editing
              ? undefined
              : async () => {
                  if (window.confirm('Delete this FAQ?')) {
                    await deleteMut.mutateAsync(editing.id);
                    setEditing(null);
                  }
                }
          }
        />
      )}
    </div>
  );
}

function stripRecord(r: FaqRecord): FaqDoc {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = r;
  return rest;
}

function QuickAddRow({
  onCreate,
}: {
  onCreate: (d: { question: string; category: string }) => Promise<void>;
}) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [busy, setBusy] = useState(false);
  const canSave = question.trim() !== '';

  async function submit() {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await onCreate({ question: question.trim(), category });
      setQuestion('');
      setCategory('general');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="bg-primary-50/40">
      <td className="px-3 py-2 text-xs text-primary-700">New</td>
      <td className="px-3 py-2">
        <input
          type="text"
          placeholder="English question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded border border-primary-200 bg-white px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded border border-primary-200 bg-white px-2 py-1 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-ink/40">—</td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSave || busy}
          className="btn bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          {busy ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

interface EditorProps {
  initial: FaqDoc;
  initialId: string | null;
  onClose: () => void;
  onSave: (id: string | null, doc: FaqDoc) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function FaqEditor({ initial, initialId, onClose, onSave, onDelete }: EditorProps) {
  const [doc, setDoc] = useState<FaqDoc>(initial);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      await onSave(initialId, doc);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminDialog title={initialId ? 'Edit FAQ' : 'New FAQ'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="block text-xs font-medium text-ink/70">Category</span>
            <select
              value={doc.category}
              onChange={(e) => setDoc({ ...doc, category: e.target.value })}
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink/70">Order</span>
            <input
              type="number"
              value={doc.order}
              onChange={(e) =>
                setDoc({ ...doc, order: e.target.value === '' ? 0 : Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <LocalePanes
          keys={LOCALE_KEYS}
          en={doc.translations.en}
          ar={doc.translations.ar}
          onChangeEn={(next) =>
            setDoc({ ...doc, translations: { ...doc.translations, en: next } })
          }
          onChangeAr={(next) =>
            setDoc({
              ...doc,
              translations: {
                en: doc.translations.en,
                ...(next ? { ar: { question: next.question ?? '', answer: next.answer ?? '' } } : {}),
              },
            })
          }
          renderExtra={(_locale, values) => (
            <div className="mt-2 rounded border border-primary-100 bg-white p-2">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-ink/50">
                Preview
              </div>
              <MarkdownPreview source={values.answer ?? ''} />
            </div>
          )}
        />
      </div>

      <div className="mt-6 flex justify-between">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="text-sm text-sienna hover:text-sienna/80"
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-primary-100 px-3 py-1.5 text-sm text-ink/70 hover:bg-primary-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={submitting}
            className="btn bg-primary-500 text-white hover:bg-primary-600"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
