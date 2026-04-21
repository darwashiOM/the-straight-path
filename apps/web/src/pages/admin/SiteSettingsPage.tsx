/**
 * SiteSettingsPage — one card per `SiteSettingId`. Each card lets the admin
 * edit the English + Arabic translations of that surface side-by-side, plus
 * any structured `data` fields (currently: `startHere.articleSlugs`).
 *
 * Data loads from Firestore via `getSiteSetting()`; if the doc is absent we
 * fall back to the English defaults shipped in `content-defaults.ts` so
 * the form is never blank on a fresh project.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, Save, Trash2 } from 'lucide-react';

import {
  getSiteSetting,
  listArticlesV2,
  saveSiteSetting,
  type AdminArticleV2,
} from '@/lib/admin-firestore';
import type { SiteSettingId } from '@/lib/content-schema';
import { DEFAULT_SITE_SETTINGS } from '@/lib/content-defaults';
import { stagePreview } from '@/lib/preview';

// ---------- Field definitions, per settings id ----------

type FieldType = 'text' | 'textarea' | 'url' | 'markdown';

interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
}

interface SettingSpec {
  id: SiteSettingId;
  title: string;
  description: string;
  previewPath: string;
  fields: FieldSpec[];
  /** If true, this setting has a `data` block we render manually below the
   *  translation fields. Currently only `startHere` uses this. */
  hasData?: boolean;
}

const SETTINGS: SettingSpec[] = [
  {
    id: 'hero',
    title: 'Homepage hero',
    description: 'Top of the homepage.',
    previewPath: '/',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'ctaPrimary', label: 'Primary CTA label', type: 'text' },
      { key: 'ctaSecondary', label: 'Secondary CTA label', type: 'text' },
    ],
  },
  {
    id: 'quranBanner',
    title: 'Qur’an banner',
    description: 'Homepage banner linking to Quran.com.',
    previewPath: '/',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'cta', label: 'CTA label', type: 'text' },
      { key: 'ctaUrl', label: 'CTA URL', type: 'url' },
    ],
  },
  {
    id: 'aboutPreview',
    title: 'About preview',
    description: 'Homepage "about" teaser block.',
    previewPath: '/',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'cta', label: 'CTA label', type: 'text' },
    ],
  },
  {
    id: 'startHere',
    title: 'Start-here block',
    description: 'Homepage curated reading list.',
    previewPath: '/',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body', type: 'textarea' },
    ],
    hasData: true,
  },
  {
    id: 'learnHeader',
    title: 'Learn header',
    description: 'Header on /learn.',
    previewPath: '/learn',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'articlesHeader',
    title: 'Articles header',
    description: 'Header on /learn/articles.',
    previewPath: '/learn/articles',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'quranAbout',
    title: 'Qur’an page — about',
    description: 'Body block on /quran (markdown).',
    previewPath: '/quran',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body', label: 'Body (Markdown)', type: 'markdown' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'Site-wide footer.',
    previewPath: '/',
    fields: [
      { key: 'copyright', label: 'Copyright line', type: 'text' },
      { key: 'madeWith', label: '"Made with" line', type: 'text' },
    ],
  },
];

export default function SiteSettingsPage() {
  const articles = useQuery({
    queryKey: ['admin', 'articlesV2'],
    queryFn: listArticlesV2,
  });

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-sm text-ink/70">
          Edit every piece of homepage and chrome copy. Each card saves independently.
        </p>
      </div>
      <div className="grid gap-6">
        {SETTINGS.map((spec) => (
          <SettingCard key={spec.id} spec={spec} articles={articles.data ?? []} />
        ))}
      </div>
    </div>
  );
}

// ---------- Card ----------

type Values = Record<string, string>;

interface CardState {
  en: Values;
  ar: Values;
  arEnabled: boolean;
  articleSlugs: string[];
}

function SettingCard({
  spec,
  articles,
}: {
  spec: SettingSpec;
  articles: AdminArticleV2[];
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', spec.id],
    queryFn: () => getSiteSetting(spec.id),
  });

  const defaults = useMemo(
    () => DEFAULT_SITE_SETTINGS.find((d) => d.id === spec.id),
    [spec.id],
  );

  const [state, setState] = useState<CardState>({
    en: {},
    ar: {},
    arEnabled: false,
    articleSlugs: [],
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const enDefaults = (defaults?.translations.en ?? {}) as Values;
    const arDefaults = (defaults?.translations.ar ?? {}) as Values;
    const enDoc = (doc?.translations?.en ?? {}) as Values;
    const arDoc = (doc?.translations?.ar ?? {}) as Values;
    const slugs = Array.isArray(doc?.data?.articleSlugs)
      ? (doc?.data?.articleSlugs as string[])
      : ((defaults?.data?.articleSlugs as string[] | undefined) ?? []);
    setState({
      en: { ...enDefaults, ...enDoc },
      ar: { ...arDefaults, ...arDoc },
      arEnabled: Boolean(doc?.translations?.ar) || Boolean(defaults?.translations.ar),
      articleSlugs: slugs,
    });
  }, [query.data, query.isLoading, defaults]);

  function patchLocale(which: 'en' | 'ar', key: string, value: string) {
    setState((s) => ({ ...s, [which]: { ...s[which], [key]: value } }));
  }

  function handlePreview() {
    const payload: {
      translations: { en: Values; ar?: Values };
      data?: Record<string, unknown>;
    } = {
      translations: {
        en: pickFields(state.en, spec.fields),
        ...(state.arEnabled ? { ar: pickFields(state.ar, spec.fields) } : {}),
      },
    };
    if (spec.hasData) {
      payload.data = { articleSlugs: state.articleSlugs };
    }
    stagePreview('siteSetting', spec.id, payload);
    const sep = spec.previewPath.includes('?') ? '&' : '?';
    window.open(`${spec.previewPath}${sep}preview=1`, '_blank', 'noopener,noreferrer');
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const payload: {
        translations: { en: Values; ar?: Values };
        data?: Record<string, unknown>;
      } = {
        translations: {
          en: pickFields(state.en, spec.fields),
          ...(state.arEnabled ? { ar: pickFields(state.ar, spec.fields) } : {}),
        },
      };
      if (spec.hasData) {
        payload.data = { articleSlugs: state.articleSlugs };
      }
      await saveSiteSetting(spec.id, payload);
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', spec.id] });
      await qc.invalidateQueries({ queryKey: ['public', 'siteSetting', spec.id] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">{spec.title}</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">{spec.id}</span> · {spec.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
            title="Open the public page with unsaved changes"
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
          {!state.arEnabled && (
            <button
              type="button"
              onClick={() => setState((s) => ({ ...s, arEnabled: true }))}
              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
            >
              Enable Arabic
            </button>
          )}
        </div>
      </header>

      {query.isLoading ? (
        <div className="text-sm text-ink/50">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <LocalePane
              locale="en"
              fields={spec.fields}
              values={state.en}
              onChange={(k, v) => patchLocale('en', k, v)}
            />
            {state.arEnabled ? (
              <LocalePane
                locale="ar"
                fields={spec.fields}
                values={state.ar}
                onChange={(k, v) => patchLocale('ar', k, v)}
              />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-primary-100 bg-primary-50/30 p-6 text-center text-sm text-ink/50">
                Arabic translation not yet provided. Click{' '}
                <span className="font-medium">Enable Arabic</span> to add one.
              </div>
            )}
          </div>

          {spec.hasData && spec.id === 'startHere' && (
            <ArticleSlugList
              slugs={state.articleSlugs}
              articles={articles}
              onChange={(slugs) => setState((s) => ({ ...s, articleSlugs: slugs }))}
            />
          )}

          {error && (
            <div className="rounded-lg border border-sienna/30 bg-sienna/5 px-3 py-2 text-sm text-sienna">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-xs text-sage">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function pickFields(values: Values, fields: FieldSpec[]): Values {
  const out: Values = {};
  for (const f of fields) out[f.key] = values[f.key] ?? '';
  return out;
}

// ---------- Locale pane ----------

function LocalePane({
  locale,
  fields,
  values,
  onChange,
}: {
  locale: 'en' | 'ar';
  fields: FieldSpec[];
  values: Values;
  onChange: (key: string, value: string) => void;
}) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <div className="rounded-lg border border-primary-100 bg-paper/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-700">
          {locale === 'en' ? 'English' : 'Arabic'}
        </h3>
        <span className="text-xs text-ink/40">{locale}</span>
      </div>
      <div className="space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="block text-xs font-medium text-ink/70">{f.label}</span>
            {f.type === 'textarea' || f.type === 'markdown' ? (
              <textarea
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                rows={f.type === 'markdown' ? 10 : 3}
                dir={dir}
                lang={locale}
                className={
                  inputCls +
                  (f.type === 'markdown' ? ' font-mono text-xs leading-relaxed' : '')
                }
              />
            ) : (
              <input
                type={f.type === 'url' ? 'url' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                dir={dir}
                lang={locale}
                className={inputCls}
              />
            )}
            {f.hint && <span className="mt-1 block text-xs text-ink/50">{f.hint}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------- startHere: ordered article slug list ----------

function ArticleSlugList({
  slugs,
  articles,
  onChange,
}: {
  slugs: string[];
  articles: AdminArticleV2[];
  onChange: (next: string[]) => void;
}) {
  const [picker, setPicker] = useState('');

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= slugs.length) return;
    const next = [...slugs];
    const a = next[i];
    const b = next[j];
    if (a === undefined || b === undefined) return;
    next[i] = b;
    next[j] = a;
    onChange(next);
  }

  function remove(i: number) {
    onChange(slugs.filter((_, idx) => idx !== i));
  }

  function add() {
    const s = picker.trim();
    if (!s) return;
    if (slugs.includes(s)) {
      setPicker('');
      return;
    }
    onChange([...slugs, s]);
    setPicker('');
  }

  const byslug = new Map(articles.map((a) => [a.slug, a]));

  return (
    <div className="rounded-lg border border-primary-100 bg-paper/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-700">
          Ordered articles
        </h3>
        <span className="text-xs text-ink/50">{slugs.length} selected</span>
      </div>
      <ul className="space-y-2">
        {slugs.length === 0 && (
          <li className="text-xs italic text-ink/50">No articles selected.</li>
        )}
        {slugs.map((slug, i) => {
          const article = byslug.get(slug);
          return (
            <li
              key={`${slug}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-primary-100 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ink">
                  {article?.translations?.en?.title ?? slug}
                </div>
                <div className="truncate font-mono text-xs text-ink/50">{slug}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === slugs.length - 1}
                  className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded p-1 text-sienna hover:bg-sienna/10"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <select
          value={picker}
          onChange={(e) => setPicker(e.target.value)}
          className={inputCls + ' max-w-xs'}
        >
          <option value="">— pick an article —</option>
          {articles
            .filter((a) => !slugs.includes(a.slug))
            .map((a) => (
              <option key={a.id} value={a.slug}>
                {a.translations?.en?.title ?? a.slug} ({a.slug})
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!picker}
          className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400';
