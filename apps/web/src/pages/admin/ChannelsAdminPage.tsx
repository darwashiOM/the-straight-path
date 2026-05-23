/**
 * ChannelsAdminPage — catalog editor for the channels collection.
 *
 * Same shape as Resources / FAQ: ordered table with up/down swaps,
 * quick-add row, and an English editor dialog. When the URL parses as a
 * YouTube channel, a small thumbnail preview is shown.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';

import AdminDialog from '@/components/admin/AdminDialog';
import LocalePanes, { type LocaleFieldKey } from '@/components/admin/LocalePanes';
import {
  type ChannelRecord,
  deleteChannelV2,
  listChannelsV2,
  saveChannelV2,
} from '@/lib/admin-catalog';
import type { ChannelDoc } from '@/lib/content-schema';

const LOCALE_KEYS: LocaleFieldKey<'name' | 'description'>[] = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description', multiline: true, rows: 4 },
];

const QK = ['admin', 'channels', 'v2'] as const;

function emptyDoc(): ChannelDoc {
  return {
    url: '',
    order: 10,
    translations: { en: { name: '', description: '' } },
    schemaVersion: 1,
  };
}

/**
 * Derive a YouTube channel identifier from a URL for thumbnail previews.
 * Covers `/@handle`, `/channel/UC…`, `/c/name`, and `/user/name`. Returns
 * null when we can't confidently identify one — the caller then shows no
 * thumbnail (better than a broken image).
 */
function parseYouTube(
  url: string,
): { kind: 'handle' | 'channel' | 'c' | 'user'; id: string } | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube\.com$/.test(u.hostname) && u.hostname !== 'youtu.be') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const first = parts[0];
    if (!first) return null;
    if (first.startsWith('@')) return { kind: 'handle', id: first.slice(1) };
    const second = parts[1];
    if (first === 'channel' && second) return { kind: 'channel', id: second };
    if (first === 'c' && second) return { kind: 'c', id: second };
    if (first === 'user' && second) return { kind: 'user', id: second };
    return null;
  } catch {
    return null;
  }
}

function ChannelThumb({ url }: { url: string }) {
  const yt = parseYouTube(url);
  if (!yt) return null;
  // YouTube does not expose a stable thumbnail by handle/name without an
  // API call, so we use a favicon fallback that still gives the admin a
  // visual hint without needing a network token.
  const src = `https://www.google.com/s2/favicons?sz=64&domain=youtube.com`;
  return (
    <img
      src={src}
      alt=""
      width={16}
      height={16}
      className="inline-block h-4 w-4 rounded"
      aria-hidden
    />
  );
}

export default function ChannelsAdminPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: QK, queryFn: listChannelsV2 });
  const rows = useMemo(
    () => (data ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [data],
  );

  const [editing, setEditing] = useState<ChannelRecord | { draft: ChannelDoc } | null>(null);

  const saveMut = useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: ChannelDoc }) => saveChannelV2(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteChannelV2(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  async function swap(a: ChannelRecord, b: ChannelRecord) {
    const aDoc: ChannelDoc = stripRecord({ ...a, order: b.order });
    const bDoc: ChannelDoc = stripRecord({ ...b, order: a.order });
    await Promise.all([saveChannelV2(a.id, aDoc), saveChannelV2(b.id, bDoc)]);
    qc.invalidateQueries({ queryKey: QK });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-primary-700 font-serif text-lg">Channels</h2>
      </div>

      <div className="border-primary-100 overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-primary-700 text-left text-xs uppercase tracking-wide">
            <tr>
              <th className="w-16 px-3 py-3">Order</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">URL</th>
              <th className="w-40 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-primary-100 divide-y">
            <QuickAddRow
              onCreate={async (partial) => {
                const doc: ChannelDoc = {
                  ...emptyDoc(),
                  url: partial.url,
                  translations: { en: { name: partial.name, description: '' } },
                  order: (rows.at(-1)?.order ?? 0) + 10,
                };
                const id = await saveMut.mutateAsync({ id: null, data: doc });
                setEditing({ id, ...doc } as ChannelRecord);
              }}
            />
            {isLoading && (
              <tr>
                <td colSpan={4} className="text-ink/50 px-4 py-6 text-center">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-ink/50 px-4 py-6 text-center">
                  No channels yet.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={row.id} className="hover:bg-primary-50/30">
                <td className="text-ink/80 px-3 py-3 align-top">
                  <div className="flex items-center gap-1">
                    <span className="w-6 tabular-nums">{row.order}</span>
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => {
                        const prev = rows[i - 1];
                        if (prev) void swap(row, prev);
                      }}
                      className="text-ink/50 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
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
                      className="text-ink/50 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                </td>
                <td className="text-ink/90 px-3 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <ChannelThumb url={row.url} />
                    <span>
                      {row.translations.en.name || <span className="text-ink/40">—</span>}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                  >
                    <span className="max-w-[220px] truncate">{row.url}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      className="text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 text-xs"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this channel?')) deleteMut.mutate(row.id);
                      }}
                      className="text-sienna hover:text-sienna/80 inline-flex items-center gap-1 text-xs"
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
        <ChannelEditor
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
                  if (window.confirm('Delete this channel?')) {
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

function stripRecord(r: ChannelRecord): ChannelDoc {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = r;
  return rest;
}

function QuickAddRow({
  onCreate,
}: {
  onCreate: (d: { url: string; name: string }) => Promise<void>;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const canSave = url.trim() !== '' && name.trim() !== '';

  async function submit() {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await onCreate({ url: url.trim(), name: name.trim() });
      setUrl('');
      setName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="bg-primary-50/40">
      <td className="text-primary-700 px-3 py-2 text-xs">New</td>
      <td className="px-3 py-2">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-primary-200 w-full rounded border bg-white px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="url"
          placeholder="https://youtube.com/@…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border-primary-200 w-full rounded border bg-white px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSave || busy}
          className="btn bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          {busy ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

interface EditorProps {
  initial: ChannelDoc;
  initialId: string | null;
  onClose: () => void;
  onSave: (id: string | null, doc: ChannelDoc) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function ChannelEditor({ initial, initialId, onClose, onSave, onDelete }: EditorProps) {
  const [doc, setDoc] = useState<ChannelDoc>(initial);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    try {
      await onSave(initialId, doc);
    } finally {
      setSubmitting(false);
    }
  }

  const yt = parseYouTube(doc.url);

  return (
    <AdminDialog title={initialId ? 'Edit channel' : 'New channel'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="text-ink/70 block text-xs font-medium">URL</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="url"
                value={doc.url}
                onChange={(e) => setDoc({ ...doc, url: e.target.value })}
                className="border-primary-100 w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
              <ChannelThumb url={doc.url} />
            </div>
            {yt && (
              <span className="text-ink/50 mt-1 block text-[11px]">
                Detected YouTube {yt.kind}: <span className="font-mono">{yt.id}</span>
              </span>
            )}
          </label>
          <label className="block">
            <span className="text-ink/70 block text-xs font-medium">Order</span>
            <input
              type="number"
              value={doc.order}
              onChange={(e) =>
                setDoc({ ...doc, order: e.target.value === '' ? 0 : Number(e.target.value) })
              }
              className="border-primary-100 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <LocalePanes
          keys={LOCALE_KEYS}
          en={doc.translations.en}
          onChangeEn={(next) => setDoc({ ...doc, translations: { en: next } })}
        />
      </div>

      <div className="mt-6 flex justify-between">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="text-sienna hover:text-sienna/80 text-sm"
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="border-primary-100 text-ink/70 hover:bg-primary-50 rounded-lg border px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={submitting}
            className="btn bg-primary-500 hover:bg-primary-600 text-white"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
