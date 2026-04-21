/**
 * ResourcesAdminPage — catalog editor for the resources collection.
 *
 * Presents an ordered table with up/down reorder arrows, a quick-add row,
 * and a dialog for full editing with side-by-side English / Arabic fields.
 * Writes go through `admin-catalog.ts` (V2, translations-nested schema).
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';

import AdminDialog from '@/components/admin/AdminDialog';
import LocalePanes, { type LocaleFieldKey } from '@/components/admin/LocalePanes';
import {
  type ResourceRecord,
  deleteResourceV2,
  listResourcesV2,
  saveResourceV2,
} from '@/lib/admin-catalog';
import type { ResourceDoc } from '@/lib/content-schema';

const CATEGORIES = ['quran', 'hadith', 'research', 'study', 'general'] as const;

const LOCALE_KEYS: LocaleFieldKey<'title' | 'description'>[] = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', multiline: true, rows: 4 },
];

const QK = ['admin', 'resources', 'v2'] as const;

function emptyDoc(): ResourceDoc {
  return {
    url: '',
    category: 'general',
    order: 10,
    translations: { en: { title: '', description: '' } },
    schemaVersion: 1,
  };
}

export default function ResourcesAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: QK, queryFn: listResourcesV2 });
  const rows = useMemo(
    () => (data ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [data],
  );

  const [editing, setEditing] = useState<ResourceRecord | { draft: ResourceDoc } | null>(null);

  const saveMut = useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: ResourceDoc }) =>
      saveResourceV2(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteResourceV2(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  async function swap(a: ResourceRecord, b: ResourceRecord) {
    // Swap the `order` values so the two rows trade places. We write both
    // in parallel; a small race window here is fine because the list
    // refreshes on success.
    const aDoc: ResourceDoc = stripRecord({ ...a, order: b.order });
    const bDoc: ResourceDoc = stripRecord({ ...b, order: a.order });
    await Promise.all([saveResourceV2(a.id, aDoc), saveResourceV2(b.id, bDoc)]);
    qc.invalidateQueries({ queryKey: QK });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-primary-700">Resources</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-primary-700">
            <tr>
              <th className="w-16 px-3 py-3">Order</th>
              <th className="px-3 py-3">EN Title</th>
              <th className="px-3 py-3">URL</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">AR Title</th>
              <th className="w-40 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-100">
            <QuickAddRow
              onCreate={async (partial) => {
                const doc: ResourceDoc = {
                  ...emptyDoc(),
                  url: partial.url,
                  category: partial.category,
                  translations: { en: { title: partial.title, description: '' } },
                  order: (rows.at(-1)?.order ?? 0) + 10,
                };
                const id = await saveMut.mutateAsync({ id: null, data: doc });
                // Open the full editor so the admin can fill in description
                // + Arabic copy while the row is fresh in their head.
                setEditing({ id, ...doc } as ResourceRecord);
              }}
            />
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
                  No resources yet.
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
                  {row.translations.en.title || <span className="text-ink/40">—</span>}
                </td>
                <td className="px-3 py-3 align-top">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                  >
                    <span className="max-w-[200px] truncate">{row.url}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="px-3 py-3 align-top text-ink/70">{row.category}</td>
                <td className="px-3 py-3 align-top text-ink/80" dir="rtl">
                  {row.translations.ar?.title || <span className="text-ink/40" dir="ltr">—</span>}
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
                        if (window.confirm('Delete this resource?'))
                          deleteMut.mutate(row.id);
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
        <ResourceEditor
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
                  if (window.confirm('Delete this resource?')) {
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

function stripRecord(r: ResourceRecord): ResourceDoc {
  // Drop server-managed metadata before sending back on save; Firestore
  // would reject Timestamps round-tripped through the client.
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = r;
  return rest;
}

function QuickAddRow({
  onCreate,
}: {
  onCreate: (d: { url: string; category: string; title: string }) => Promise<void>;
}) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<string>('general');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const canSave = url.trim() !== '' && title.trim() !== '';

  async function submit() {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await onCreate({ url: url.trim(), category, title: title.trim() });
      setUrl('');
      setTitle('');
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
          placeholder="English title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-primary-200 bg-white px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="url"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
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
  initial: ResourceDoc;
  initialId: string | null;
  onClose: () => void;
  onSave: (id: string | null, doc: ResourceDoc) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function ResourceEditor({ initial, initialId, onClose, onSave, onDelete }: EditorProps) {
  const [doc, setDoc] = useState<ResourceDoc>(initial);
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
    <AdminDialog title={initialId ? 'Edit resource' : 'New resource'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="block text-xs font-medium text-ink/70">URL</span>
            <input
              type="url"
              value={doc.url}
              onChange={(e) => setDoc({ ...doc, url: e.target.value })}
              className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
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
                ...(next ? { ar: { title: next.title ?? '', description: next.description ?? '' } } : {}),
              },
            })
          }
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
