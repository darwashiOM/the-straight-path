/**
 * Parsing for mobile-billboard orders as they arrive in
 * `billboard-orders/{id}`. The document was written by an anonymous browser
 * client and the security rules can't add up quantities, so this is where
 * the real checks happen: known ids only, whole quantities, and at most
 * `MAX_STICKERS_PER_ORDER` stickers in total.
 */
import type { DocumentData } from 'firebase-admin/firestore';

import { parseAddress, str, toDate, type ShippingAddress } from '../contact/types';
import { BILLBOARD_LABELS, MAX_STICKERS_PER_ORDER } from './catalog';

export interface BillboardOrderLine {
  id: string;
  /** Notion multi-select option, e.g. `05. Repel Evil With Good`. */
  label: string;
  quantity: number;
}

export interface BillboardOrderInput {
  id: string;
  name: string;
  email: string;
  address: ShippingAddress;
  lines: BillboardOrderLine[];
  total: number;
  locale?: string;
  source?: string;
  createdAt: Date;
}

export type ParsedOrder = { ok: true; order: BillboardOrderInput } | { ok: false; reason: string };

function parseLines(value: unknown): BillboardOrderLine[] | string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'items is not a map';
  const lines: BillboardOrderLine[] = [];
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const label = BILLBOARD_LABELS[id];
    if (!label) return `unknown billboard id "${id.slice(0, 20)}"`;
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
      return `bad quantity for billboard ${id}`;
    }
    lines.push({ id, label, quantity: raw });
  }
  return lines.sort((a, b) => a.id.localeCompare(b.id));
}

/** Validate and normalise a raw order document. */
export function parseOrder(id: string, data: DocumentData): ParsedOrder {
  const lines = parseLines(data.items);
  if (typeof lines === 'string') return { ok: false, reason: lines };
  const total = lines.reduce((sum, l) => sum + l.quantity, 0);
  if (total < 1) return { ok: false, reason: 'no stickers selected' };
  if (total > MAX_STICKERS_PER_ORDER) {
    return { ok: false, reason: `${total} stickers requested (max ${MAX_STICKERS_PER_ORDER})` };
  }

  const address = parseAddress(data.address);
  if (!address || !address.street || !address.city || !address.state || !address.zip) {
    return { ok: false, reason: 'incomplete shipping address' };
  }

  const name = str(data.name, 120);
  if (!name) return { ok: false, reason: 'missing name' };

  return {
    ok: true,
    order: {
      id,
      name,
      email: str(data.email, 200),
      address,
      lines,
      total,
      locale: str(data.locale, 10) || undefined,
      source: str(data.source, 40) || undefined,
      createdAt: toDate(data.createdAt),
    },
  };
}

/** `2 × 01. God Forgave Adam` */
export function lineText(l: BillboardOrderLine): string {
  return `${l.quantity} × ${l.label}`;
}
