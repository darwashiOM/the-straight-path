/**
 * LocalePanes — generic side-by-side English/Arabic editor used by the
 * catalog editors (Resources, FAQ, Channels).
 *
 * Callers declare a list of `keys` (e.g. `title` / `description`) along with
 * per-key metadata (label, multiline?). The component renders two columns:
 * one bound to the `en` value object, one bound to `ar`. The Arabic pane is
 * optional — `ar` may be undefined until the admin types into it.
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
  ar: Partial<LocaleValues<T>> | undefined;
  onChangeEn: (next: LocaleValues<T>) => void;
  onChangeAr: (next: Partial<LocaleValues<T>> | undefined) => void;
  /** Optional extra content rendered under each pane (e.g. a markdown preview). */
  renderExtra?: (locale: 'en' | 'ar', values: Partial<LocaleValues<T>>) => ReactNode;
}

export default function LocalePanes<T extends string>({
  keys,
  en,
  ar,
  onChangeEn,
  onChangeAr,
  renderExtra,
}: Props<T>) {
  const arFilled = ar ?? ({} as Partial<LocaleValues<T>>);

  function setEn(k: T, v: string) {
    onChangeEn({ ...en, [k]: v });
  }
  function setAr(k: T, v: string) {
    // If the admin clears every field on the Arabic side, collapse it to
    // undefined so the doc omits `translations.ar` entirely.
    const next: Partial<LocaleValues<T>> = { ...arFilled, [k]: v };
    const hasAny = keys.some((f) => (next[f.key] ?? '').trim() !== '');
    onChangeAr(hasAny ? next : undefined);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Pane
        title="English"
        dir="ltr"
        keys={keys}
        values={en}
        onSet={setEn}
        extra={renderExtra?.('en', en)}
      />
      <Pane
        title="Arabic"
        dir="rtl"
        keys={keys}
        values={arFilled}
        onSet={setAr}
        extra={renderExtra?.('ar', arFilled)}
      />
    </div>
  );
}

interface PaneProps<T extends string> {
  title: string;
  dir: 'ltr' | 'rtl';
  keys: LocaleFieldKey<T>[];
  values: Partial<LocaleValues<T>>;
  onSet: (k: T, v: string) => void;
  extra?: ReactNode;
}

function Pane<T extends string>({ title, dir, keys, values, onSet, extra }: PaneProps<T>) {
  return (
    <section className="rounded-lg border border-primary-100 bg-paper/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-primary-700">{title}</h4>
        <span className="text-[10px] uppercase tracking-wide text-ink/50">{dir}</span>
      </div>
      <div className="space-y-3">
        {keys.map((k) => (
          <label key={k.key} className="block">
            <span className="block text-xs font-medium text-ink/70">{k.label}</span>
            {k.multiline ? (
              <textarea
                dir={dir}
                rows={k.rows ?? 4}
                value={values[k.key] ?? ''}
                onChange={(e) => onSet(k.key, e.target.value)}
                placeholder={k.placeholder}
                className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            ) : (
              <input
                dir={dir}
                type="text"
                value={values[k.key] ?? ''}
                onChange={(e) => onSet(k.key, e.target.value)}
                placeholder={k.placeholder}
                className="mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            )}
          </label>
        ))}
        {extra}
      </div>
    </section>
  );
}
