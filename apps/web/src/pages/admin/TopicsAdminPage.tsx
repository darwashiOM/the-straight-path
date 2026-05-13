/**
 * TopicsAdminPage — the lightest-weight editor we've got. Each row is a
 * slug + EN/AR label + order. We allow inline create via a row at the top
 * of the table and inline edit via a small form that expands underneath
 * the clicked row.
 */
import { type FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';

import { deleteTopic, listTopicsAdmin, saveTopic } from '@/lib/admin-editorial';
import type { TopicDoc } from '@/lib/content-schema';

type Row = TopicDoc & { id: string };

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function TopicsAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'topics'],
    queryFn: listTopicsAdmin,
  });

  const rows = useMemo(() => data ?? [], [data]);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Inline "new topic" row — kept separate from the edit state.
  const [newSlug, setNewSlug] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newAr, setNewAr] = useState('');
  const [newOrder, setNewOrder] = useState<number>(() => 10);
  const [newError, setNewError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: async () => {
      const slug = slugify(newSlug);
      if (!slug) throw new Error('Slug is required.');
      if (!newEn.trim()) throw new Error('English label is required.');
      const data: TopicDoc = {
        slug,
        order: Number.isFinite(newOrder) ? newOrder : 10,
        translations: {
          en: { label: newEn.trim() },
          ...(newAr.trim() ? { ar: { label: newAr.trim() } } : {}),
        },
        schemaVersion: 1,
      };
      await saveTopic(slug, data);
    },
    onSuccess: async () => {
      setNewSlug('');
      setNewEn('');
      setNewAr('');
      setNewOrder(10);
      setNewError(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'topics'] });
    },
    onError: (e) => setNewError(e instanceof Error ? e.message : 'Save failed'),
  });

  const reorderMut = useMutation({
    mutationFn: async ({ row, dir }: { row: Row; dir: -1 | 1 }) => {
      const sorted = [...rows].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((r) => r.id === row.id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= sorted.length) return;
      const other = sorted[target]!;
      await saveTopic(row.slug, { ...row, order: other.order });
      await saveTopic(other.slug, { ...other, order: row.order });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'topics'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) => deleteTopic(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'topics'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-primary-700 font-serif text-lg">Topics</h2>
      </div>

      <div className="border-primary-100 overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-primary-700 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="w-24 px-4 py-3">Order</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Label (EN)</th>
              <th className="px-4 py-3">Label (AR)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-primary-100 divide-y">
            {/* Inline "new topic" row. */}
            <tr className="bg-primary-50/30">
              <td className="px-4 py-2">
                <input
                  type="number"
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value === '' ? 0 : Number(e.target.value))}
                  className={inputSmall}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="new-topic-slug"
                  className={`${inputSmall} font-mono text-xs`}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                  placeholder="Label in English"
                  className={inputSmall}
                />
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  dir="rtl"
                  value={newAr}
                  onChange={(e) => setNewAr(e.target.value)}
                  placeholder="التسمية (اختياري)"
                  className={inputSmall}
                />
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  type="button"
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending}
                  className="btn bg-primary-500 hover:bg-primary-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                  {createMut.isPending ? 'Adding…' : 'Add'}
                </button>
              </td>
            </tr>

            {newError && (
              <tr>
                <td
                  colSpan={5}
                  className="border-sienna/30 bg-sienna/5 text-sienna border-t px-4 py-2 text-sm"
                >
                  {newError}
                </td>
              </tr>
            )}

            {isLoading && (
              <tr>
                <td colSpan={5} className="text-ink/50 px-4 py-6 text-center">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-ink/50 px-4 py-6 text-center">
                  No topics yet. Add one using the row above.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const isEditing = editingId === row.id;
              return (
                <RowView
                  key={row.id}
                  row={row}
                  isEditing={isEditing}
                  isFirst={idx === 0}
                  isLast={idx === rows.length - 1}
                  onEdit={() => setEditingId(isEditing ? null : row.id)}
                  onClose={() => setEditingId(null)}
                  onSaved={async () => {
                    await qc.invalidateQueries({ queryKey: ['admin', 'topics'] });
                    setEditingId(null);
                  }}
                  onMoveUp={() => reorderMut.mutate({ row, dir: -1 })}
                  onMoveDown={() => reorderMut.mutate({ row, dir: 1 })}
                  onDelete={() => {
                    if (window.confirm(`Delete topic "${row.slug}"?`)) deleteMut.mutate(row.slug);
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowViewProps {
  row: Row;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function RowView({
  row,
  isEditing,
  isFirst,
  isLast,
  onEdit,
  onClose,
  onSaved,
  onMoveUp,
  onMoveDown,
  onDelete,
}: RowViewProps) {
  return (
    <>
      <tr className="hover:bg-primary-50/20">
        <td className="px-4 py-3 align-top">
          <div className="flex items-center gap-1">
            <span className="text-ink/60 w-6">{row.order}</span>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              className="text-ink/60 hover:bg-primary-50 rounded p-1 disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              className="text-ink/60 hover:bg-primary-50 rounded p-1 disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </td>
        <td className="text-ink/70 px-4 py-3 align-top font-mono text-xs">{row.slug}</td>
        <td className="text-ink/80 px-4 py-3 align-top">{row.translations.en.label}</td>
        <td className="text-ink/80 px-4 py-3 align-top" dir="rtl">
          {row.translations.ar?.label ?? ''}
        </td>
        <td className="px-4 py-3 text-right align-top">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs"
            >
              <Pencil className="h-3 w-3" />
              {isEditing ? 'Close' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-sienna hover:text-sienna/80 inline-flex items-center gap-1 text-xs"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        </td>
      </tr>
      {isEditing && (
        <tr>
          <td colSpan={5} className="border-primary-100 bg-primary-50/20 border-t p-4">
            <InlineEdit row={row} onClose={onClose} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

function InlineEdit({
  row,
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [order, setOrder] = useState<number>(row.order);
  const [en, setEn] = useState(row.translations.en.label);
  const [ar, setAr] = useState(row.translations.ar?.label ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!en.trim()) {
      setError('English label is required.');
      return;
    }
    setSaving(true);
    try {
      const data: TopicDoc = {
        slug: row.slug,
        order: Number.isFinite(order) ? order : 10,
        translations: {
          en: { label: en.trim() },
          ...(ar.trim() ? { ar: { label: ar.trim() } } : {}),
        },
        schemaVersion: 1,
      };
      await saveTopic(row.slug, data);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Slug</span>
          <input
            type="text"
            value={row.slug}
            disabled
            className={`${inputSmall} font-mono text-xs`}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Order</span>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value === '' ? 0 : Number(e.target.value))}
            className={inputSmall}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Label (EN)</span>
          <input
            type="text"
            value={en}
            onChange={(e) => setEn(e.target.value)}
            className={inputSmall}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Label (AR)</span>
          <input
            type="text"
            dir="rtl"
            value={ar}
            onChange={(e) => setAr(e.target.value)}
            className={inputSmall}
          />
        </label>
      </div>
      {error && (
        <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="border-primary-100 text-ink/70 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn bg-primary-500 hover:bg-primary-600 text-white"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

const inputSmall =
  'mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:bg-primary-50/60 disabled:text-ink/60';
