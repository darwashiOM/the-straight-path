/**
 * Creates one row in the team's Notion "Contact submissions" database for
 * every contact-form submission.
 *
 * Talks to the public Notion API directly over `fetch` (Node 20 has it
 * built in), scoped by an *internal integration* token that only has access
 * to the one database shared with it. No SDK needed.
 *
 * Column names are resolved against the live database schema, so small
 * differences in spelling ("Submitted Date" vs "Submitted date") don't
 * matter: names are compared case- and whitespace-insensitively, and a few
 * unambiguous columns (title, the only date/email/phone column) are found
 * by type. A column that can't be found is skipped with a warning rather
 * than failing the whole row. The expected names live in `NOTION_PROPS`.
 */
import { logger } from 'firebase-functions/v2';

import { type ContactSubmissionInput, formatAddress, requestedLabels, TYPE_LABELS } from './types';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
/** Notion rejects rich-text segments longer than 2000 characters. */
const RICH_TEXT_LIMIT = 2000;
const PREVIEW_LIMIT = 300;
const SCHEMA_TTL_MS = 5 * 60 * 1000;

/** Expected column names (matched loosely — see file header). */
export const NOTION_PROPS = {
  title: 'Name',
  email: 'Email',
  submitted: 'Submitted date',
  type: 'Type',
  preview: 'Message Preview',
  request: 'Request',
  phone: 'Phone',
  address: 'Address',
  firestoreId: 'Firestore ID',
  assignee: 'Assigned To',
} as const;

type PropKey = keyof typeof NOTION_PROPS;

/** Notion property type each column must have to receive our value. */
const EXPECTED_TYPES: Record<PropKey, string> = {
  title: 'title',
  email: 'email',
  submitted: 'date',
  type: 'multi_select',
  preview: 'rich_text',
  request: 'multi_select',
  phone: 'phone_number',
  address: 'rich_text',
  firestoreId: 'rich_text',
  assignee: 'people',
};

export interface NotionConfig {
  token: string;
  databaseId: string;
  /** Optional Notion user id to set in "Assigned To" (triggers a notification). */
  assigneeId?: string;
}

export interface NotionPageRef {
  id: string;
  url: string;
}

interface SchemaProp {
  name: string;
  type: string;
}

type RichText = { type: 'text'; text: { content: string } };

function text(content: string): RichText[] {
  return [{ type: 'text', text: { content: content.slice(0, RICH_TEXT_LIMIT) } }];
}

function chunk(content: string, size = RICH_TEXT_LIMIT): string[] {
  const out: string[] = [];
  for (let i = 0; i < content.length; i += size) out.push(content.slice(i, i + size));
  return out.length ? out : [''];
}

function paragraph(content: string) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(content) } };
}

function heading(content: string) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: text(content) } };
}

function bullet(content: string) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: text(content) },
  };
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function notionError(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
  return new Error(
    `Notion API ${res.status}${body.code ? ` (${body.code})` : ''}: ${body.message ?? 'unknown error'}`,
  );
}

// ---------- Schema discovery ----------

const schemaCache = new Map<string, { at: number; props: SchemaProp[] }>();

async function fetchSchema(cfg: NotionConfig): Promise<SchemaProp[]> {
  const cached = schemaCache.get(cfg.databaseId);
  if (cached && Date.now() - cached.at < SCHEMA_TTL_MS) return cached.props;

  const res = await fetch(`${NOTION_API}/databases/${cfg.databaseId}`, {
    headers: headers(cfg.token),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw await notionError(res);
  const body = (await res.json()) as { properties?: Record<string, { type?: string }> };
  const props = Object.entries(body.properties ?? {}).map(([name, p]) => ({
    name,
    type: p?.type ?? '',
  }));
  schemaCache.set(cfg.databaseId, { at: Date.now(), props });
  return props;
}

function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Map each expected column to the real column name in the database.
 * Order of preference: exact name → loose name match with the right type →
 * the only column of that type (for types that are naturally unique).
 */
function resolveColumns(schema: SchemaProp[]): Partial<Record<PropKey, string>> {
  const resolved: Partial<Record<PropKey, string>> = {};
  const byNorm = new Map(schema.map((p) => [normalise(p.name), p]));
  const uniqueByType = new Map<string, SchemaProp>();
  for (const p of schema) {
    if (schema.filter((q) => q.type === p.type).length === 1) uniqueByType.set(p.type, p);
  }

  for (const key of Object.keys(NOTION_PROPS) as PropKey[]) {
    const wanted = NOTION_PROPS[key];
    const type = EXPECTED_TYPES[key];
    const exact = schema.find((p) => p.name === wanted && p.type === type);
    const loose = byNorm.get(normalise(wanted));
    const candidate =
      exact ?? (loose && loose.type === type ? loose : undefined) ?? uniqueByType.get(type);
    if (candidate) resolved[key] = candidate.name;
  }
  return resolved;
}

// ---------- Payload ----------

function buildProperties(
  cfg: NotionConfig,
  s: ContactSubmissionInput,
  col: Partial<Record<PropKey, string>>,
): Record<string, unknown> {
  const preview =
    s.message.length > PREVIEW_LIMIT ? `${s.message.slice(0, PREVIEW_LIMIT - 1)}…` : s.message;

  const values: Partial<Record<PropKey, unknown>> = {
    title: { title: text(s.name) },
    email: { email: s.email || null },
    submitted: { date: { start: s.createdAt.toISOString() } },
    type: { multi_select: [{ name: TYPE_LABELS[s.type] }] },
    preview: { rich_text: text(preview) },
    firestoreId: { rich_text: text(s.id) },
  };

  if (s.support) {
    values.request = { multi_select: requestedLabels(s).map((name) => ({ name })) };
    if (s.support.phone) values.phone = { phone_number: s.support.phone };
    if (s.support.address) values.address = { rich_text: text(formatAddress(s.support.address)) };
  }

  if (cfg.assigneeId) {
    values.assignee = { people: [{ object: 'user', id: cfg.assigneeId }] };
  }

  const props: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const [key, value] of Object.entries(values) as Array<[PropKey, unknown]>) {
    const name = col[key];
    if (name) props[name] = value;
    else missing.push(NOTION_PROPS[key]);
  }
  if (missing.length) {
    logger.warn('Notion columns not found; values skipped', { missing });
  }
  if (!col.title) throw new Error('Notion database has no title column');
  return props;
}

function buildChildren(s: ContactSubmissionInput) {
  const blocks: unknown[] = [heading('Message'), ...chunk(s.message).map(paragraph)];

  if (s.support) {
    blocks.push(heading('Support request'));
    blocks.push(bullet(`Requested: ${requestedLabels(s).join(', ')}`));
    if (s.support.phone) blocks.push(bullet(`Phone: ${s.support.phone}`));
    if (s.support.address) blocks.push(bullet(`Ships to: ${formatAddress(s.support.address)}`));
    if (s.support.details) {
      blocks.push(bullet('Details:'));
      blocks.push(...chunk(s.support.details).map(paragraph));
    }
  }

  const meta = [
    s.locale ? `Language: ${s.locale}` : null,
    s.source ? `Source: ${s.source}` : null,
    `Firestore: contact-submissions/${s.id}`,
  ].filter((x): x is string => Boolean(x));
  blocks.push(heading('Meta'));
  blocks.push(...meta.map(bullet));

  return blocks;
}

export async function createNotionPage(
  cfg: NotionConfig,
  s: ContactSubmissionInput,
): Promise<NotionPageRef> {
  let columns: Partial<Record<PropKey, string>>;
  try {
    columns = resolveColumns(await fetchSchema(cfg));
  } catch (err) {
    // Reading the schema needs the integration's "Read content" capability.
    // Without it, fall back to the expected names verbatim.
    logger.warn('Could not read Notion schema; using expected column names', {
      error: err instanceof Error ? err.message : String(err),
    });
    columns = { ...NOTION_PROPS };
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: headers(cfg.token),
    body: JSON.stringify({
      parent: { database_id: cfg.databaseId },
      properties: buildProperties(cfg, s, columns),
      children: buildChildren(s),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw await notionError(res);
  const body = (await res.json()) as { id?: string; url?: string };
  if (!body.id) throw new Error('Notion API: page created without an id');
  return { id: body.id, url: body.url ?? '' };
}
