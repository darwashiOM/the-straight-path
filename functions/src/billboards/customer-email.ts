/**
 * Emails to the person who placed a mobile-billboard order:
 *  - "We got your order" right after they place it (`onBillboardOrder`);
 *  - "Your Mobile Billboards are on the way" once the team sets Order Status
 *    to Shipped in Notion (`notifyShippedBillboardOrders`).
 *
 * Sent with the same verified Resend sender as the team notifications. That
 * sender isn't a real inbox, so unless `replyTo` is set the emails point
 * people to the contact page for questions.
 */
import { Resend } from 'resend';

import type { EmailResult } from '../contact/email';
import { formatAddress } from '../contact/types';
import { escapeHtml } from '../shared/html';
import type { ShippedOrder } from './notion';
import { type BillboardOrderInput, lineText } from './order';

export const RECEIVED_SUBJECT = 'We got your order';
export const SHIPPED_SUBJECT = 'Your Mobile Billboards are on the way';

const SITE = 'https://www.thestraightpath.org';

export interface CustomerEmailConfig {
  apiKey: string;
  from: string;
  /** Inbox that receives customer replies; empty → point to the contact page. */
  replyTo?: string;
}

type Block = { text: string } | { list: string[] };

/** `2 × 01. God Forgave Adam` → `2 × God Forgave Adam` (ids are for the team). */
export function customerItem(line: string): string {
  return line.replace(/(^|×\s)\d{1,3}\.\s/, '$1');
}

function closing(cfg: CustomerEmailConfig): Block[] {
  return [
    {
      text: cfg.replyTo
        ? 'Questions? Just reply to this email.'
        : `Questions? Write to us at ${SITE}/contact`,
    },
    { text: `The Straight Path\n${SITE}` },
  ];
}

export function receivedBlocks(cfg: CustomerEmailConfig, o: BillboardOrderInput): Block[] {
  return [
    { text: `Hi ${o.name},` },
    {
      text: 'Thank you for ordering free Mobile Billboards (Dawah bumper stickers) from The Straight Path. We’ve received your order and will mail it soon, inshā’Allāh.',
    },
    { text: 'Your stickers:' },
    { list: o.lines.map((l) => customerItem(lineText(l))) },
    { text: `Shipping to:\n${formatAddress(o.address)}` },
    { text: 'We’ll email you again when they’re on the way.' },
    ...closing(cfg),
  ];
}

export function shippedBlocks(cfg: CustomerEmailConfig, s: ShippedOrder): Block[] {
  const blocks: Block[] = [
    { text: s.name ? `Hi ${s.name},` : 'Hi,' },
    { text: 'Good news: your Mobile Billboards are on the way!' },
  ];
  if (s.items.length) blocks.push({ text: 'Your stickers:' }, { list: s.items.map(customerItem) });
  if (s.address) blocks.push({ text: `Shipped to:\n${s.address}` });
  blocks.push({ text: 'Thank you for helping share the message.' }, ...closing(cfg));
  return blocks;
}

export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => ('list' in b ? b.list.map((i) => `• ${i}`).join('\n') : b.text))
    .join('\n\n');
}

export function blocksToHtml(blocks: Block[]): string {
  const body = blocks
    .map((b) =>
      'list' in b
        ? `<ul style="margin:0 0 16px;padding-left:20px">${b.list.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
        : `<p style="margin:0 0 16px">${escapeHtml(b.text).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:560px">${body}</div>`;
}

export async function sendCustomerEmail(
  cfg: CustomerEmailConfig,
  to: string,
  subject: string,
  blocks: Block[],
): Promise<EmailResult> {
  const resend = new Resend(cfg.apiKey);
  const { data, error } = await resend.emails.send({
    from: cfg.from,
    to: [to],
    subject,
    text: blocksToText(blocks),
    html: blocksToHtml(blocks),
    ...(cfg.replyTo ? { replyTo: cfg.replyTo } : {}),
  });
  if (error || !data) {
    throw new Error(`Resend: ${error?.name ?? 'error'} — ${error?.message ?? 'no response'}`);
  }
  return { id: data.id };
}
