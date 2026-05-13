/**
 * Single-locale (English) field editor used by the catalog editors
 * (Resources, FAQ, Channels). The component used to render side-by-side
 * EN/AR panes; Arabic was removed from the site, so this now renders one
 * English pane. The public API keeps the `ar` / `onChangeAr` props as
 * accepted-but-ignored so existing pages don't need to rewrite their form
 * state during this refactor.
 */
import { type ReactNode } from 'react';

export interface LocaleFieldKey<T extends string> {
  key: T;
  label: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}

export type LocaleValues<T extends string> = Record<T, string>;

interface Props<T extends string> {
  keys: LocaleFieldKey<T>[];
  en: LocaleValues<T>;
  /** Legacy — ignored. */
  ar?: Partial<LocaleValues<T>> | undefined;
  onChangeEn: (next: LocaleValues<T>) => void;
  /** Legacy — never called. */
  onChangeAr?: (next: Partial<LocaleValues<T>> | undefined) => void;
  /** Optional extra content rendered under the pane (e.g. a markdown preview). */
  renderExtra?: (locale: 'en', values: LocaleValues<T>) => ReactNode;
}

export default function LocalePanes<T extends string>({
  keys,
  en,
  onChangeEn,
  renderExtra,
}: Props<T>) {
  function setEn(k: T, v: string) {
    onChangeEn({ ...en, [k]: v });
  }

  return (
    <section className="border-primary-100 bg-paper/30 rounded-lg border p-3">
      <div className="space-y-3">
        {keys.map((k) => (
          <label key={k.key} className="block">
            <span className="text-ink/70 block text-xs font-medium">{k.label}</span>
            {k.multiline ? (
              <textarea
                dir="ltr"
                rows={k.rows ?? 4}
                value={en[k.key] ?? ''}
                onChange={(e) => setEn(k.key, e.target.value)}
                placeholder={k.placeholder}
                className="border-primary-100 focus:border-primary-400 focus:ring-primary-400 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            ) : (
              <input
                dir="ltr"
                type="text"
                value={en[k.key] ?? ''}
                onChange={(e) => setEn(k.key, e.target.value)}
                placeholder={k.placeholder}
                className="border-primary-100 focus:border-primary-400 focus:ring-primary-400 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1"
              />
            )}
          </label>
        ))}
        {renderExtra?.('en', en)}
      </div>
    </section>
  );
}
