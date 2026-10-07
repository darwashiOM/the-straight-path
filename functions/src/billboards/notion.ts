/**
 * Creates one row in the team's Notion "Mobile Billboard Orders" database
 * for every order placed on /mobile-billboards.
 *
 * Columns are matched loosely by name (see `../shared/notion`); a column
 * that can't be found is skipped with a warning. Order Status, Created time
 * and formulas are left to Notion.
 *
 * "Address" may be a Place (map) column or a Text column. For a Place
 * column the address is geocoded first (Notion needs coordinates); when
 * that fails the map cell stays empty and a note in the page body says so.
 * The full address is always written to the page body as text.
 */
import { logger } from 'firebase-functions/v2';

import { formatAddress } from '../contact/types';
import {
  bullet,
  createPage,
  fetchSchema,
  findColumn,
  heading,
  NotionApiError,
  type NotionPageRef,
  paragraph,
  resolveColumns,
  type SchemaProp,
  text,
} from '../shared/notion';
import { geocodeUsAddress } from './geocode';
import { type BillboardOrderInput, lineText } from './order';

/** Expected column names (matched loosely). */
export const ORDER_NOTION_PROPS = {
  title: 'Name',
  email: 'Email',
  billboards: 'Billboard ID',
  quantity: 'Quantity',
  items: 'Items',
  assignee: 'Assigned To',
} as const;

/** Matched separately because it may be a Place or a Text column. */
export const ADDRESS_COLUMN = 'Address';

type PropKey = keyof typeof ORDER_NOTION_PROPS;

const EXPECTED_TYPES: Record<PropKey, string> = {
  title: 'title',
  email: 'email',
  billboards: 'multi_select',
  quantity: 'number',
  items: 'rich_text',
  assignee: 'people',
};

/** "Items" is optional free text: never guess it from the only text column. */
const TYPE_FALLBACK: readonly PropKey[] = ['title', 'email', 'billboards', 'quantity', 'assignee'];

export interface OrderNotionConfig {
  token: string;
  databaseId: string;
  /** Optional Notion user id to set in "Assigned To". */
  assigneeId?: string;
}

export interface OrderNotionResult extends NotionPageRef {
  /** Whether the address landed in a Place (map) column. */
  mapped: boolean;
}

interface AddressValue {
  column?: string;
  value?: unknown;
  mapped: boolean;
  /** Shown in the page body when the map location couldn't be set. */
  note?: string;
}

async function buildAddress(
  schema: SchemaProp[] | undefined,
  o: BillboardOrderInput,
): Promise<AddressValue> {
  const col = schema ? findColumn(schema, ADDRESS_COLUMN) : undefined;
  const formatted = formatAddress(o.address);
  if (!col) {
    logger.warn('Notion "Address" column not found; address only in the page body');
    return { mapped: false };
  }

  if (col.type === 'rich_text') {
    return { column: col.name, value: { rich_text: text(formatted) }, mapped: false };
  }

  if (col.type === 'place') {
    try {
      const point = await geocodeUsAddress(o.address);
      if (point) {
        return {
          column: col.name,
          value: { place: { lat: point.lat, lon: point.lon, name: formatted, address: formatted } },
          mapped: true,
        };
      }
      logger.warn('Address not found by the geocoder', { id: o.id });
    } catch (err) {
      logger.warn('Geocoding failed', {
        id: o.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return {
      mapped: false,
      note: 'Not on the map: this address could not be matched automatically. Please check it.',
    };
  }

  logger.warn('Notion "Address" column has an unsupported type', { type: col.type });
  return { mapped: false };
}

function buildProperties(
  cfg: OrderNotionConfig,
  o: BillboardOrderInput,
  col: Partial<Record<PropKey, string>>,
  address: AddressValue,
): Record<string, unknown> {
  const values: Partial<Record<PropKey, unknown>> = {
    title: { title: text(o.name) },
    email: { email: o.email || null },
    billboards: { multi_select: o.lines.map((l) => ({ name: l.label })) },
    quantity: { number: o.total },
    items: { rich_text: text(o.lines.map(lineText).join('\n')) },
  };
  if (cfg.assigneeId) {
    values.assignee = { people: [{ object: 'user', id: cfg.assigneeId }] };
  }

  const props: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const [key, value] of Object.entries(values) as Array<[PropKey, unknown]>) {
    const name = col[key];
    if (name) props[name] = value;
    else missing.push(ORDER_NOTION_PROPS[key]);
  }
  if (address.column && address.value) props[address.column] = address.value;
  if (missing.length) {
    logger.warn('Notion columns not found; values skipped', { missing });
  }
  if (!col.title) throw new Error('Notion database has no title column');
  return props;
}

function buildChildren(o: BillboardOrderInput, addressNote?: string) {
  const blocks: unknown[] = [
    heading('Stickers'),
    ...o.lines.map((l) => bullet(lineText(l))),
    bullet(`Total: ${o.total}`),
    heading('Ship to'),
    paragraph(o.name),
    paragraph(formatAddress(o.address)),
  ];
  if (addressNote) blocks.push(paragraph(addressNote));

  const meta = [
    o.email ? `Email: ${o.email}` : null,
    o.locale ? `Language: ${o.locale}` : null,
    o.source ? `Source: ${o.source}` : null,
    `Firestore: billboard-orders/${o.id}`,
  ].filter((x): x is string => Boolean(x));
  blocks.push(heading('Meta'));
  blocks.push(...meta.map(bullet));
  return blocks;
}

export async function createOrderPage(
  cfg: OrderNotionConfig,
  o: BillboardOrderInput,
): Promise<OrderNotionResult> {
  let schema: SchemaProp[] | undefined;
  try {
    schema = await fetchSchema(cfg.token, cfg.databaseId);
  } catch (err) {
    logger.warn('Could not read Notion schema; using expected column names', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const address = await buildAddress(schema, o);
  const columns = schema
    ? resolveColumns(
        schema.filter((p) => p.name !== address.column),
        ORDER_NOTION_PROPS,
        EXPECTED_TYPES,
        TYPE_FALLBACK,
      )
    : { ...ORDER_NOTION_PROPS };
  const props = buildProperties(cfg, o, columns, address);

  try {
    const page = await createPage(cfg.token, cfg.databaseId, props, buildChildren(o, address.note));
    return { ...page, mapped: address.mapped };
  } catch (err) {
    // If Notion refuses the map value, still create the row without it.
    if (
      !(address.mapped && address.column && err instanceof NotionApiError && err.status === 400)
    ) {
      throw err;
    }
    logger.warn('Notion rejected the map address; retrying without it', { error: err.message });
    delete props[address.column];
    const page = await createPage(
      cfg.token,
      cfg.databaseId,
      props,
      buildChildren(o, 'Not on the map: Notion did not accept the location. Address is above.'),
    );
    return { ...page, mapped: false };
  }
}
