/**
 * Creates one row in the team's Notion "Contact submissions" database for
 * every contact-form submission.
 *
 * Talks to the public Notion API directly over `fetch` (Node 20 has it
 * built in), scoped by an *internal integration* token that only has access
 * to the one database shared with it. No SDK needed.
 *
 * Property names below must match the database columns exactly (case-
 * sensitive). If a column is renamed in Notion, update `NOTION_PROPS`.
 */
import { type ContactSubmissionInput, formatAddress, requestedLabels, TYPE_LABELS } from './types';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
/** Notion rejects rich-text segments longer than 2000 characters. */
const RICH_TEXT_LIMIT = 2000;
const PREVIEW_LIMIT = 300;

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

function buildProperties(cfg: NotionConfig, s: ContactSubmissionInput) {
  const preview =
    s.message.length > PREVIEW_LIMIT ? `${s.message.slice(0, PREVIEW_LIMIT - 1)}…` : s.message;

  const props: Record<string, unknown> = {
    [NOTION_PROPS.title]: { title: text(s.name) },
    [NOTION_PROPS.email]: { email: s.email || null },
    [NOTION_PROPS.submitted]: { date: { start: s.createdAt.toISOString() } },
    [NOTION_PROPS.type]: { multi_select: [{ name: TYPE_LABELS[s.type] }] },
    [NOTION_PROPS.preview]: { rich_text: text(preview) },
    [NOTION_PROPS.firestoreId]: { rich_text: text(s.id) },
  };

  if (s.support) {
    props[NOTION_PROPS.request] = {
      multi_select: requestedLabels(s).map((name) => ({ name })),
    };
    if (s.support.phone) props[NOTION_PROPS.phone] = { phone_number: s.support.phone };
    if (s.support.address) {
      props[NOTION_PROPS.address] = { rich_text: text(formatAddress(s.support.address)) };
    }
  }

  if (cfg.assigneeId) {
    props[NOTION_PROPS.assignee] = { people: [{ object: 'user', id: cfg.assigneeId }] };
  }

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
  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: cfg.databaseId },
      properties: buildProperties(cfg, s),
      children: buildChildren(s),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    url?: string;
    message?: string;
    code?: string;
  };

  if (!res.ok || !body.id) {
    throw new Error(
      `Notion API ${res.status}${body.code ? ` (${body.code})` : ''}: ${body.message ?? 'unknown error'}`,
    );
  }
  return { id: body.id, url: body.url ?? '' };
}
