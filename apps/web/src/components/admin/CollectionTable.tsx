import { type ReactNode, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';

/**
 * Generic "simple CRUD table" used by Resources, FAQ and Channels.
 *
 * Rendering a modal-ish form inline keeps the admin surface very small and
 * the build light. Validation is per-field via the schema you pass in.
 */
export interface FieldSpec<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'url' | 'number' | 'textarea';
  placeholder?: string;
  required?: boolean;
  render?: (row: T) => ReactNode;
}

export interface CollectionTableProps<T extends { id: string }> {
  queryKey: readonly unknown[];
  load: () => Promise<T[]>;
  create: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  update: (id: string, data: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  columns: FieldSpec<T>[];
  defaults: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
  title: string;
  empty?: string;
}

export default function CollectionTable<T extends { id: string }>(
  props: CollectionTableProps<T>,
) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: props.queryKey, queryFn: props.load });

  const [editing, setEditing] = useState<T | 'new' | null>(null);

  const createMut = useMutation({
    mutationFn: (d: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => props.create(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: props.queryKey }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => props.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: props.queryKey }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => props.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: props.queryKey }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-primary-700">{props.title}</h2>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="btn bg-primary-500 text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-primary-700">
            <tr>
              {props.columns.map((c) => (
                <th key={c.key} className="px-4 py-3">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-100">
            {isLoading && (
              <tr>
                <td
                  colSpan={props.columns.length + 1}
                  className="px-4 py-6 text-center text-ink/50"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={props.columns.length + 1}
                  className="px-4 py-6 text-center text-ink/50"
                >
                  {props.empty ?? 'Nothing here yet.'}
                </td>
              </tr>
            )}
            {(data ?? []).map((row) => (
              <tr key={row.id} className="hover:bg-primary-50/30">
                {props.columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-top text-ink/80">
                    {c.render
                      ? c.render(row)
                      : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
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
                        if (window.confirm('Delete this entry?'))
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
        <EditDialog
          columns={props.columns}
          defaults={props.defaults}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (editing === 'new') {
              await createMut.mutateAsync(values);
            } else {
              await updateMut.mutateAsync({ id: editing.id, data: values as Partial<T> });
            }
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

interface EditDialogProps<T extends { id: string }> {
  columns: FieldSpec<T>[];
  defaults: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
  initial: T | null;
  onClose: () => void;
  onSubmit: (values: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

function EditDialog<T extends { id: string }>({
  columns,
  defaults,
  initial,
  onClose,
  onSubmit,
}: EditDialogProps<T>) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const base = { ...(defaults as Record<string, unknown>) };
    if (initial) for (const k of Object.keys(base)) base[k] = (initial as Record<string, unknown>)[k] ?? base[k];
    return base;
  });
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      await onSubmit(values as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 font-serif text-lg text-primary-700">
          {initial ? 'Edit entry' : 'New entry'}
        </h3>
        <div className="space-y-3">
          {columns.map((c) => (
            <label key={c.key} className="block">
              <span className="block text-sm font-medium text-ink/80">{c.label}</span>
              {c.type === 'textarea' ? (
                <textarea
                  value={String(values[c.key] ?? '')}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [c.key]: e.target.value }))
                  }
                  rows={4}
                  placeholder={c.placeholder}
                  className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              ) : (
                <input
                  type={c.type ?? 'text'}
                  value={String(values[c.key] ?? '')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setValues((v) => ({
                      ...v,
                      [c.key]: c.type === 'number' ? (raw === '' ? 0 : Number(raw)) : raw,
                    }));
                  }}
                  required={c.required}
                  placeholder={c.placeholder}
                  className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
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
    </div>
  );
}
