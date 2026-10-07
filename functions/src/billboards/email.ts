/**
 * Emails the team inbox for every mobile-billboard order, via Resend.
 *
 * Every subject starts with `ORDER_SUBJECT` so an Outlook/Gmail rule can
 * file them; the customer's name follows so each order is its own thread.
 * `reply_to` is the customer's address.
 */
import { Resend } from 'resend';

import { formatAddress, looksLikeEmail } from '../contact/types';
import type { EmailConfig, EmailResult } from '../contact/email';
import { escapeHtml } from '../shared/html';
import { type BillboardOrderInput, lineText } from './order';

export const ORDER_SUBJECT = 'Straight Path Mobile Billboard Order';

export function buildOrderSubject(o: BillboardOrderInput): string {
  return `${ORDER_SUBJECT} from ${o.name}`;
}

interface Line {
  label: string;
  value: string;
}

function summaryLines(o: BillboardOrderInput, notionUrl?: string): Line[] {
  const lines: Line[] = [
    { label: 'Name', value: o.name },
    { label: 'Email', value: o.email || '(none)' },
    { label: 'Ships to', value: formatAddress(o.address) },
    { label: 'Stickers', value: o.lines.map(lineText).join('\n') },
    { label: 'Total', value: String(o.total) },
    { label: 'Received', value: o.createdAt.toUTCString() },
  ];
  if (notionUrl) lines.push({ label: 'Notion', value: notionUrl });
  lines.push({ label: 'Firestore', value: `billboard-orders/${o.id}` });
  return lines;
}

export function buildOrderText(o: BillboardOrderInput, notionUrl?: string): string {
  return summaryLines(o, notionUrl)
    .map((l) => `${l.label}: ${l.value.replace(/\n/g, '\n  ')}`)
    .join('\n');
}

export function buildOrderHtml(o: BillboardOrderInput, notionUrl?: string): string {
  const rows = summaryLines(o, notionUrl)
    .map((l) => {
      const value =
        l.label === 'Notion'
          ? `<a href="${escapeHtml(l.value)}">Open in Notion</a>`
          : escapeHtml(l.value).replace(/\n/g, '<br>');
      return `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;vertical-align:top">${escapeHtml(l.label)}</td><td style="padding:4px 0">${value}</td></tr>`;
    })
    .join('');
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">
<table style="border-collapse:collapse">${rows}</table>
</div>`;
}

export async function sendOrderEmail(
  cfg: EmailConfig,
  o: BillboardOrderInput,
  notionUrl?: string,
): Promise<EmailResult> {
  const resend = new Resend(cfg.apiKey);
  const { data, error } = await resend.emails.send({
    from: cfg.from,
    to: cfg.to,
    subject: buildOrderSubject(o),
    text: buildOrderText(o, notionUrl),
    html: buildOrderHtml(o, notionUrl),
    ...(looksLikeEmail(o.email) ? { replyTo: o.email } : {}),
  });
  if (error || !data) {
    throw new Error(`Resend: ${error?.name ?? 'error'} — ${error?.message ?? 'no response'}`);
  }
  return { id: data.id };
}
