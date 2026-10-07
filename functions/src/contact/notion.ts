/**
 * Creates one row in the team's Notion "Contact submissions" database for
 * every contact-form submission.
 *
 * The HTTP calls and the loose column matching live in `../shared/notion`;
 * this file only decides what goes in each column. A column that can't be
 * found is skipped with a warning rather than failing the whole row. The
 * expected names live in `NOTION_PROPS`.
 */
import { logger } from 'firebase-functions/v2';

import {
  bullet,
  chunk,
  createPage,
  fetchSchema,
  heading,
  type NotionPageRef,
  paragraph,
  resolveColumns,
  text,
} from '../shared/notion';
import { type ContactSubmissionInput, formatAddress, requestedLabels, TYPE_LABELS } from './types';

export type { NotionPageRef };

const PREVIEW_LIMIT = 300;

/** Expected column names (matched loosely — see `../shared/notion`). */
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
    columns = resolveColumns(
      await fetchSchema(cfg.token, cfg.databaseId),
      NOTION_PROPS,
      EXPECTED_TYPES,
    );
  } catch (err) {
    // Reading the schema needs the integration's "Read content" capability.
    // Without it, fall back to the expected names verbatim.
    logger.warn('Could not read Notion schema; using expected column names', {
      error: err instanceof Error ? err.message : String(err),
    });
    columns = { ...NOTION_PROPS };
  }

  return createPage(cfg.token, cfg.databaseId, buildProperties(cfg, s, columns), buildChildren(s));
}
