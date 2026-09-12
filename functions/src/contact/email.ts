/**
 * Emails the admin inbox for every contact-form submission, via Resend.
 *
 * Every message carries the same subject prefix (`CONTACT_SUBJECT_PREFIX`)
 * so an Outlook/Gmail rule can file them reliably. `reply_to` is set to the
 * visitor's address so hitting Reply answers them directly.
 */
import { Resend } from 'resend';

import {
  type ContactSubmissionInput,
  formatAddress,
  looksLikeEmail,
  requestedLabels,
} from './types';

export const CONTACT_SUBJECT_PREFIX = '[Straight Path Contact]';

export interface EmailConfig {
  apiKey: string;
  /** e.g. `The Straight Path <contact@thestraightpath.org>` — domain must be verified in Resend. */
  from: string;
  to: string[];
}

export interface EmailResult {
  id: string;
}

export function buildSubject(s: ContactSubmissionInput): string {
  const kind = s.type === 'support' ? 'Support request' : 'Message';
  return `${CONTACT_SUBJECT_PREFIX} ${kind} from ${s.name}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Line {
  label: string;
  value: string;
}

function summaryLines(s: ContactSubmissionInput, notionUrl?: string): Line[] {
  const lines: Line[] = [
    { label: 'Name', value: s.name },
    { label: 'Email', value: s.email || '(none)' },
    { label: 'Type', value: s.type === 'support' ? 'Support request' : 'Question / message' },
  ];
  if (s.support) {
    lines.push({ label: 'Requested', value: requestedLabels(s).join(', ') });
    if (s.support.phone) lines.push({ label: 'Phone', value: s.support.phone });
    if (s.support.address)
      lines.push({ label: 'Ships to', value: formatAddress(s.support.address) });
  }
  lines.push({ label: 'Received', value: s.createdAt.toUTCString() });
  if (notionUrl) lines.push({ label: 'Notion', value: notionUrl });
  lines.push({ label: 'Firestore', value: `contact-submissions/${s.id}` });
  return lines;
}

export function buildText(s: ContactSubmissionInput, notionUrl?: string): string {
  const parts = [
    summaryLines(s, notionUrl)
      .map((l) => `${l.label}: ${l.value}`)
      .join('\n'),
    '',
    'Message:',
    s.message,
  ];
  if (s.support?.details) parts.push('', 'Support details:', s.support.details);
  return parts.join('\n');
}

export function buildHtml(s: ContactSubmissionInput, notionUrl?: string): string {
  const rows = summaryLines(s, notionUrl)
    .map((l) => {
      const value =
        l.label === 'Notion'
          ? `<a href="${escapeHtml(l.value)}">Open in Notion</a>`
          : escapeHtml(l.value);
      return `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${escapeHtml(l.label)}</td><td style="padding:4px 0">${value}</td></tr>`;
    })
    .join('');
  const pre = (value: string) =>
    `<pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(value)}</pre>`;
  const details = s.support?.details
    ? `<h3 style="margin:20px 0 8px">Support details</h3>${pre(s.support.details)}`
    : '';
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">
<table style="border-collapse:collapse;margin-bottom:16px">${rows}</table>
<h3 style="margin:20px 0 8px">Message</h3>${pre(s.message)}${details}
</div>`;
}

export async function sendContactEmail(
  cfg: EmailConfig,
  s: ContactSubmissionInput,
  notionUrl?: string,
): Promise<EmailResult> {
  const resend = new Resend(cfg.apiKey);
  const { data, error } = await resend.emails.send({
    from: cfg.from,
    to: cfg.to,
    subject: buildSubject(s),
    text: buildText(s, notionUrl),
    html: buildHtml(s, notionUrl),
    ...(looksLikeEmail(s.email) ? { replyTo: s.email } : {}),
  });
  if (error || !data) {
    throw new Error(`Resend: ${error?.name ?? 'error'} — ${error?.message ?? 'no response'}`);
  }
  return { id: data.id };
}
