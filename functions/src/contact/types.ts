/**
 * Shared shapes + parsing for contact-form submissions as they arrive in
 * `contact-submissions/{id}`. Everything here is defensive: the document was
 * written by an anonymous browser client, so treat every field as untrusted
 * and clamp lengths before handing data to Notion or an email provider.
 */
import type { DocumentData } from 'firebase-admin/firestore';

import type { ShippingAddress, SupportRequest, SupportServiceKey } from '../schemas';

export type { ShippingAddress, SupportRequest, SupportServiceKey };

export type SubmissionType = 'question' | 'support';

export interface ContactSubmissionInput {
  id: string;
  name: string;
  email: string;
  message: string;
  type: SubmissionType;
  locale?: string;
  source?: string;
  createdAt: Date;
  support?: SupportRequest;
}

export const SERVICE_KEYS: readonly SupportServiceKey[] = ['mentor', 'quran', 'hijab'];

/** Human labels; also used verbatim as Notion multi-select option names. */
export const SERVICE_LABELS: Record<SupportServiceKey, string> = {
  mentor: 'Mentor',
  quran: 'Quran',
  hijab: 'Hijab',
};

export const TYPE_LABELS: Record<SubmissionType, string> = {
  question: 'Question',
  support: 'Support',
};

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optionalStr(value: unknown, max: number): string | undefined {
  const s = str(value, max);
  return s.length > 0 ? s : undefined;
}

function parseAddress(value: unknown): ShippingAddress | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const a = value as Record<string, unknown>;
  const address: ShippingAddress = {
    street: str(a.street, 200),
    city: str(a.city, 100),
    state: str(a.state, 40),
    zip: str(a.zip, 20),
  };
  return address.street || address.city || address.state || address.zip ? address : undefined;
}

function parseSupport(value: unknown): SupportRequest | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const s = value as Record<string, unknown>;
  const requests = Array.isArray(s.requests)
    ? s.requests.filter((r): r is SupportServiceKey =>
        (SERVICE_KEYS as readonly string[]).includes(String(r)),
      )
    : [];
  if (requests.length === 0) return undefined;
  return {
    requests: Array.from(new Set(requests)),
    details: optionalStr(s.details, 2000),
    phone: optionalStr(s.phone, 40),
    address: parseAddress(s.address),
  };
}

function toDate(value: unknown): Date {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Normalise a raw Firestore document into a trusted, length-clamped shape. */
export function parseSubmission(id: string, data: DocumentData): ContactSubmissionInput {
  const support = parseSupport(data.support);
  return {
    id,
    name: str(data.name, 120) || '(no name)',
    email: str(data.email, 200),
    message: str(data.message, 5000),
    type: support ? 'support' : 'question',
    locale: optionalStr(data.locale, 10),
    source: optionalStr(data.source, 40),
    createdAt: toDate(data.createdAt),
    support,
  };
}

export function formatAddress(a: ShippingAddress): string {
  const line2 = [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [a.street, line2].filter(Boolean).join(', ');
}

export function requestedLabels(s: ContactSubmissionInput): string[] {
  return (s.support?.requests ?? []).map((k) => SERVICE_LABELS[k]);
}

/** Loose sanity check — enough to decide whether `reply_to` is safe to set. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
}
