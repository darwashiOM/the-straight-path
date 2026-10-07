/**
 * Minimal Notion API client shared by every form that writes to a Notion
 * database (contact submissions, mobile-billboard orders).
 *
 * Talks to the public Notion API directly over `fetch` (Node 20 has it
 * built in), scoped by an *internal integration* token that only has access
 * to the databases shared with it. No SDK needed.
 *
 * Column names are resolved against the live database schema, so small
 * differences in spelling ("Submitted Date" vs "Submitted date") don't
 * matter: names are compared case- and whitespace-insensitively, and
 * unambiguous columns (the only title/email/number column) can be found by
 * type. A column that can't be found is skipped by the callers rather than
 * failing the whole row.
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
/** Notion rejects rich-text segments longer than 2000 characters. */
export const RICH_TEXT_LIMIT = 2000;
const SCHEMA_TTL_MS = 5 * 60 * 1000;

export interface NotionPageRef {
  id: string;
  url: string;
}

export interface SchemaProp {
  name: string;
  type: string;
}

/** Error from the Notion API, with the HTTP status kept for retry decisions. */
export class NotionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'NotionApiError';
  }
}

// ---------- Block / rich-text helpers ----------

type RichText = { type: 'text'; text: { content: string } };

export function text(content: string): RichText[] {
  return [{ type: 'text', text: { content: content.slice(0, RICH_TEXT_LIMIT) } }];
}

export function chunk(content: string, size = RICH_TEXT_LIMIT): string[] {
  const out: string[] = [];
  for (let i = 0; i < content.length; i += size) out.push(content.slice(i, i + size));
  return out.length ? out : [''];
}

export function paragraph(content: string) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: text(content) } };
}

export function heading(content: string) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: text(content) } };
}

export function bullet(content: string) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: text(content) },
  };
}

// ---------- HTTP ----------

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function notionError(res: Response): Promise<NotionApiError> {
  const body = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
  return new NotionApiError(
    `Notion API ${res.status}${body.code ? ` (${body.code})` : ''}: ${body.message ?? 'unknown error'}`,
    res.status,
    body.code,
  );
}

/** Create one page (row) in a database. */
export async function createPage(
  token: string,
  databaseId: string,
  properties: Record<string, unknown>,
  children: unknown[],
): Promise<NotionPageRef> {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties, children }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw await notionError(res);
  const body = (await res.json()) as { id?: string; url?: string };
  if (!body.id) throw new Error('Notion API: page created without an id');
  return { id: body.id, url: body.url ?? '' };
}

// ---------- Schema discovery ----------

const schemaCache = new Map<string, { at: number; props: SchemaProp[] }>();

/** The database's columns. Needs the integration's "Read content" capability. */
export async function fetchSchema(token: string, databaseId: string): Promise<SchemaProp[]> {
  const cached = schemaCache.get(databaseId);
  if (cached && Date.now() - cached.at < SCHEMA_TTL_MS) return cached.props;

  const res = await fetch(`${NOTION_API}/databases/${databaseId}`, {
    headers: headers(token),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw await notionError(res);
  const body = (await res.json()) as { properties?: Record<string, { type?: string }> };
  const props = Object.entries(body.properties ?? {}).map(([name, p]) => ({
    name,
    type: p?.type ?? '',
  }));
  schemaCache.set(databaseId, { at: Date.now(), props });
  return props;
}

function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Find a column by name (loosely), whatever its type. */
export function findColumn(schema: SchemaProp[], wanted: string): SchemaProp | undefined {
  return (
    schema.find((p) => p.name === wanted) ??
    schema.find((p) => normalise(p.name) === normalise(wanted))
  );
}

/**
 * Map each expected column to the real column name in the database.
 * Order of preference: exact name → loose name match with the right type →
 * the only column of that type (only for keys listed in `typeFallback`,
 * default all). A column is never assigned to two keys.
 */
export function resolveColumns<K extends string>(
  schema: SchemaProp[],
  names: Record<K, string>,
  types: Record<K, string>,
  typeFallback: readonly K[] = Object.keys(names) as K[],
): Partial<Record<K, string>> {
  const resolved: Partial<Record<K, string>> = {};
  const used = new Set<string>();
  const keys = Object.keys(names) as K[];

  for (const key of keys) {
    const match = findColumn(schema, names[key]);
    if (match && match.type === types[key] && !used.has(match.name)) {
      resolved[key] = match.name;
      used.add(match.name);
    }
  }

  for (const key of keys) {
    if (resolved[key] || !typeFallback.includes(key)) continue;
    const ofType = schema.filter((p) => p.type === types[key]);
    const only = ofType.length === 1 ? ofType[0] : undefined;
    if (only && !used.has(only.name)) {
      resolved[key] = only.name;
      used.add(only.name);
    }
  }
  return resolved;
}
