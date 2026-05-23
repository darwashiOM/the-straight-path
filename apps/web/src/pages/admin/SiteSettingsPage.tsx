/**
 * SiteSettingsPage — one card per `SiteSettingId`. Each card lets the admin
 * edit the English translations of that surface, plus any structured `data`
 * fields (currently: `startHere.articleSlugs`).
 *
 * Data loads from Firestore via `getSiteSetting()`; if the doc is absent we
 * fall back to the English defaults shipped in `content-defaults.ts` so
 * the form is never blank on a fresh project.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, Image as ImageIcon, Plus, Save, Trash2 } from 'lucide-react';

import {
  getSiteSetting,
  listArticlesV2,
  saveSiteSetting,
  type AdminArticleV2,
} from '@/lib/admin-firestore';
import type {
  BrandData,
  BrandTranslations,
  FooterNavColumn,
  FooterNavData,
  HomepageSection,
  HomepageSectionId,
  HomepageSectionsData,
  FeaturedData,
  NavItem,
  NavItemsData,
  NotFoundData,
  NotFoundPopularLink,
  QuickLinkIcon,
  QuickLinkItem,
  QuickLinksData,
  SeoData,
  SeoRouteOverride,
  SiteSettingId,
} from '@/lib/content-schema';
import {
  DEFAULT_BRAND_SETTING,
  DEFAULT_FOOTER_NAV,
  DEFAULT_NAV_ITEMS,
  DEFAULT_QUICK_LINKS,
  DEFAULT_SITE_SETTINGS,
} from '@/lib/content-defaults';
import { stageAndOpenPreview, stagePreview } from '@/lib/preview';
import MediaPicker from '@/components/admin/MediaPicker';

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
  {
    id: 'resourcesHeader',
    title: 'Resources header',
    description: 'Page header on /resources.',
    previewPath: '/resources',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'faqHeader',
    title: 'FAQ header',
    description: 'Page header on /faq.',
    previewPath: '/faq',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    id: 'socialHeader',
    title: 'Social header',
    description: 'Page header on /social.',
    previewPath: '/social',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
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
        <p className="text-ink/70 text-sm">
          Edit every piece of homepage and chrome copy. Each card saves independently.
        </p>
      </div>
      <div className="grid gap-6">
        <BrandCard />
        <NavItemsCard />
        <QuickLinksCard />
        <FooterNavCard />
        {SETTINGS.map((spec) => (
          <SettingCard key={spec.id} spec={spec} articles={articles.data ?? []} />
        ))}
        <ContactIntroCard />
        <NotFoundCard />
        <HomepageSectionsCard />
        <FeaturedCard articles={articles.data ?? []} />
        <SeoCard />
      </div>
    </div>
  );
}

// ---------- Card ----------

type Values = Record<string, string>;

interface CardState {
  en: Values;
  articleSlugs: string[];
}

function SettingCard({ spec, articles }: { spec: SettingSpec; articles: AdminArticleV2[] }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', spec.id],
    queryFn: () => getSiteSetting(spec.id),
  });

  const defaults = useMemo(() => DEFAULT_SITE_SETTINGS.find((d) => d.id === spec.id), [spec.id]);

  const [state, setState] = useState<CardState>({
    en: {},
    articleSlugs: [],
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const enDefaults = (defaults?.translations.en ?? {}) as Values;
    const enDoc = (doc?.translations?.en ?? {}) as Values;
    const slugs = Array.isArray(doc?.data?.articleSlugs)
      ? (doc?.data?.articleSlugs as string[])
      : ((defaults?.data?.articleSlugs as string[] | undefined) ?? []);
    setState({
      en: { ...enDefaults, ...enDoc },
      articleSlugs: slugs,
    });
  }, [query.data, query.isLoading, defaults]);

  function patchEn(key: string, value: string) {
    setState((s) => ({ ...s, en: { ...s.en, [key]: value } }));
  }

  function handlePreview() {
    const payload: {
      translations: { en: Values };
      data?: Record<string, unknown>;
    } = {
      translations: {
        en: pickFields(state.en, spec.fields),
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
        translations: { en: Values };
        data?: Record<string, unknown>;
      } = {
        translations: {
          en: pickFields(state.en, spec.fields),
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
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">{spec.title}</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">{spec.id}</span> · {spec.description}
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
        </div>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-5">
          <LocalePane fields={spec.fields} values={state.en} onChange={patchEn} />

          {spec.hasData && spec.id === 'startHere' && (
            <ArticleSlugList
              slugs={state.articleSlugs}
              articles={articles}
              onChange={(slugs) => setState((s) => ({ ...s, articleSlugs: slugs }))}
            />
          )}

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
  fields,
  values,
  onChange,
}: {
  fields: FieldSpec[];
  values: Values;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
      <div className="space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-ink/70 block text-xs font-medium">{f.label}</span>
            {f.type === 'textarea' || f.type === 'markdown' ? (
              <textarea
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                rows={f.type === 'markdown' ? 10 : 3}
                dir="ltr"
                lang="en"
                className={
                  inputCls + (f.type === 'markdown' ? ' font-mono text-xs leading-relaxed' : '')
                }
              />
            ) : (
              <input
                type={f.type === 'url' ? 'url' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                dir="ltr"
                lang="en"
                className={inputCls}
              />
            )}
            {f.hint && <span className="text-ink/50 mt-1 block text-xs">{f.hint}</span>}
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
    <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-primary-700 text-sm font-semibold uppercase tracking-wide">
          Ordered articles
        </h3>
        <span className="text-ink/50 text-xs">{slugs.length} selected</span>
      </div>
      <ul className="space-y-2">
        {slugs.length === 0 && (
          <li className="text-ink/50 text-xs italic">No articles selected.</li>
        )}
        {slugs.map((slug, i) => {
          const article = byslug.get(slug);
          return (
            <li
              key={`${slug}-${i}`}
              className="border-primary-100 flex items-center justify-between gap-2 rounded-md border bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate text-sm">
                  {article?.translations?.en?.title ?? slug}
                </div>
                <div className="text-ink/50 truncate font-mono text-xs">{slug}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === slugs.length - 1}
                  className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-sienna hover:bg-sienna/10 rounded p-1"
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
          className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-lg border border-primary-100 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400';

// ---------- Brand card ----------

/**
 * `BrandCard` — edits the `brand` siteSetting: per-locale site name/tagline,
 * plus non-locale `logoUrl` and `ogImage`. The logo, when set, takes the
 * navbar's accent-dot slot; the OG image is the site-wide social default.
 */
function BrandCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'brand'],
    queryFn: () => getSiteSetting<BrandTranslations>('brand'),
  });

  const [enVal, setEnVal] = useState<BrandTranslations>({ siteName: '', tagline: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'logo' | 'og' | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const defEn = DEFAULT_BRAND_SETTING.translations.en;
    const defData = (DEFAULT_BRAND_SETTING.data ?? {}) as BrandData;
    const docEn = doc?.translations?.en ?? ({} as BrandTranslations);
    const docData = (doc?.data ?? {}) as BrandData;
    setEnVal({
      siteName: docEn.siteName ?? defEn.siteName,
      tagline: docEn.tagline ?? defEn.tagline ?? '',
    });
    setLogoUrl(docData.logoUrl ?? defData.logoUrl ?? '');
    setOgImage(docData.ogImage ?? defData.ogImage ?? '');
  }, [query.data, query.isLoading]);

  function buildPayload() {
    const payload: {
      translations: { en: BrandTranslations };
      data?: Record<string, unknown>;
    } = {
      translations: {
        en: { siteName: enVal.siteName, tagline: enVal.tagline || undefined },
      },
      data: { logoUrl: logoUrl.trim(), ogImage: ogImage.trim() },
    };
    return payload;
  }

  function handlePreview() {
    stageAndOpenPreview('siteSetting', 'brand', buildPayload(), '/');
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload();
      await saveSiteSetting('brand', payload);
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'brand'] });
      await qc.invalidateQueries({ queryKey: ['content', 'siteSettings', 'brand'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">Brand</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">brand</span> · Site name, tagline, logo,
            and default OG image.
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
        </div>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-5">
          <BrandLocalePane
            values={enVal}
            onChange={(patch) => setEnVal((v) => ({ ...v, ...patch }))}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <MediaField
              label="Logo image"
              hint="If set, the navbar shows this image (sized to h-8) instead of the accent dot."
              value={logoUrl}
              onChange={setLogoUrl}
              onOpenPicker={() => setPickerTarget('logo')}
            />
            <MediaField
              label="Default OG image"
              hint="Used as the site-wide default social-share image when a page has no hero."
              value={ogImage}
              onChange={setOgImage}
              onOpenPicker={() => setPickerTarget('og')}
            />
          </div>

          <BrandLivePreview siteName={enVal.siteName} logoUrl={logoUrl} />

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <MediaPicker
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        currentUrl={pickerTarget === 'logo' ? logoUrl : ogImage}
        onPick={(url) => {
          if (pickerTarget === 'logo') setLogoUrl(url);
          else if (pickerTarget === 'og') setOgImage(url);
          setPickerTarget(null);
        }}
      />
    </section>
  );
}

function BrandLocalePane({
  values,
  onChange,
}: {
  values: BrandTranslations;
  onChange: (patch: Partial<BrandTranslations>) => void;
}) {
  return (
    <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Site name</span>
          <input
            type="text"
            value={values.siteName}
            onChange={(e) => onChange({ siteName: e.target.value })}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Tagline (optional)</span>
          <input
            type="text"
            value={values.tagline ?? ''}
            onChange={(e) => onChange({ tagline: e.target.value })}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
      </div>
    </div>
  );
}

function MediaField({
  label,
  hint,
  value,
  onChange,
  onOpenPicker,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  onOpenPicker: () => void;
}) {
  return (
    <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-primary-700 text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        <button
          type="button"
          onClick={onOpenPicker}
          className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
        >
          <ImageIcon className="h-3 w-3" />
          Pick from library
        </button>
      </div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        className={inputCls}
      />
      {hint && <p className="text-ink/50 mt-1 text-xs">{hint}</p>}
      {value ? (
        <div className="border-primary-100 mt-3 overflow-hidden rounded-md border bg-white">
          <img
            src={value}
            alt=""
            className="max-h-24 w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function BrandLivePreview({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  return (
    <div className="border-primary-100 bg-paper/40 rounded-lg border p-4">
      <div className="text-primary-700 mb-2 text-xs font-semibold uppercase tracking-wide">
        Navbar preview
      </div>
      <div className="border-primary-500/10 bg-paper/80 text-primary-700 flex h-16 items-center gap-2 rounded-md border px-4 font-serif text-xl font-semibold">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
        ) : (
          <span aria-hidden="true" className="bg-accent-400 inline-block h-2 w-2 rounded-full" />
        )}
        {siteName || <span className="text-ink/40">Site name</span>}
      </div>
    </div>
  );
}

// ---------- Navigation-items card ----------

/**
 * `NavItemsCard` — ordered table of nav entries with inline validation on
 * the `to` path, up/down reorder, a visibility checkbox, per-row delete, and
 * an "Add item" button. The `to` column accepts a canonical path (`/learn`,
 * `/faq`) — the navbar composes the locale prefix at render time, so a
 * user-supplied `/ar/learn` would double-prefix and is blocked here.
 */
function NavItemsCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'navItems'],
    queryFn: () => getSiteSetting('navItems'),
  });

  const [items, setItems] = useState<NavItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const docItems = (doc?.data as NavItemsData | undefined)?.items;
    const seed = docItems && docItems.length > 0 ? docItems : DEFAULT_NAV_ITEMS;
    const sorted = [...seed].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setItems(sorted.map((it, i) => ({ ...it, order: i })));
  }, [query.data, query.isLoading]);

  function patch(index: number, next: Partial<NavItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...next } : it)));
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const a = next[index];
    const b = next[j];
    if (!a || !b) return;
    next[index] = b;
    next[j] = a;
    setItems(next.map((it, i) => ({ ...it, order: i })));
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index).map((it, i) => ({ ...it, order: i })));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        to: '/',
        key: `item-${prev.length + 1}`,
        labelEn: 'New item',

        visible: true,
        order: prev.length,
      },
    ]);
  }

  function handlePreview() {
    stageAndOpenPreview(
      'siteSetting',
      'navItems',
      {
        translations: { en: {} },
        data: { items: items.map((it, i) => ({ ...it, order: i })) },
      },
      '/',
    );
  }

  async function save() {
    setError(null);
    // Validate paths before hitting Firestore.
    for (const it of items) {
      const err = validatePath(it.to);
      if (err) {
        setError(`"${it.labelEn || it.key}" → ${err}`);
        return;
      }
      if (!it.key.trim()) {
        setError(`An item is missing its key.`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveSiteSetting('navItems', {
        translations: { en: {} },
        data: { items: items.map((it, i) => ({ ...it, order: i })) },
      });
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'navItems'] });
      await qc.invalidateQueries({ queryKey: ['content', 'siteSettings', 'navItems'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">Navigation items</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">navItems</span> · Reorder, rename, or
            hide the navbar links.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          title="Open the public page with unsaved changes"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-ink/50 text-left text-xs uppercase tracking-wide">
                  <th className="px-2 py-2 font-medium">Order</th>
                  <th className="px-2 py-2 font-medium">Label</th>
                  <th className="px-2 py-2 font-medium">Path</th>
                  <th className="px-2 py-2 font-medium">Visible</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const pathError = validatePath(it.to);
                  return (
                    <tr key={`${it.key}-${i}`} className="border-primary-100 border-t">
                      <td className="px-2 py-2 align-top">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                            aria-label="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(i, 1)}
                            disabled={i === items.length - 1}
                            className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                            aria-label="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="text"
                          value={it.labelEn}
                          onChange={(e) => patch(i, { labelEn: e.target.value })}
                          className={inputCls + ' mt-0'}
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          type="text"
                          value={it.to}
                          onChange={(e) => patch(i, { to: e.target.value })}
                          placeholder="/learn"
                          className={
                            inputCls +
                            ' mt-0 font-mono text-xs' +
                            (pathError ? 'border-sienna focus:border-sienna focus:ring-sienna' : '')
                          }
                        />
                        {pathError && <p className="text-sienna mt-1 text-xs">{pathError}</p>}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={it.visible}
                            onChange={(e) => patch(i, { visible: e.target.checked })}
                          />
                          <span className="text-ink/60 text-xs">
                            {it.visible ? 'Visible' : 'Hidden'}
                          </span>
                        </label>
                      </td>
                      <td className="px-2 py-2 text-right align-top">
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="text-sienna hover:bg-sienna/10 rounded p-1"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-ink/50 px-2 py-4 text-center text-xs italic">
                      No items. Click "Add item" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <button
              type="button"
              onClick={addItem}
              className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add item
            </button>
          </div>

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

/** Lightweight client-side sanity check on a canonical nav path. The
 *  navbar composes the locale prefix via `localizePath`, so the stored `to`
 *  must be locale-free. We also reject query/hash fragments — nav is for
 *  routing, not ad-hoc links. */
function validatePath(p: string): string | null {
  if (!p.startsWith('/')) return 'Must start with "/"';
  if (p.includes('?') || p.includes('#')) return 'No "?" or "#" allowed';
  if (p === '/ar' || p.startsWith('/ar/')) return 'Omit the "/ar" locale prefix';
  return null;
}

// ---------- Quick-links card ----------

const QUICK_LINK_ICON_OPTIONS: { value: QuickLinkIcon; label: string }[] = [
  { value: 'users', label: 'Users' },
  { value: 'link', label: 'Link' },
  { value: 'help', label: 'Help' },
  { value: 'message', label: 'Message' },
  { value: 'book', label: 'Book' },
  { value: 'star', label: 'Star' },
  { value: 'mail', label: 'Mail' },
];

/**
 * `QuickLinksCard` — edits the homepage's four-card grid. Each row has EN/AR
 * label + description, an icon dropdown, canonical `to` path, visibility
 * toggle, and up/down reorder. Paths go through the same `validatePath`
 * guard as navItems so editors can't accidentally double-prefix locales.
 */
function QuickLinksCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'quickLinks'],
    queryFn: () => getSiteSetting('quickLinks'),
  });

  const [items, setItems] = useState<QuickLinkItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const docItems = (doc?.data as QuickLinksData | undefined)?.items;
    const seed = docItems && docItems.length > 0 ? docItems : DEFAULT_QUICK_LINKS;
    const sorted = [...seed].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setItems(sorted.map((it, i) => ({ ...it, order: i })));
  }, [query.data, query.isLoading]);

  function patch(index: number, next: Partial<QuickLinkItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...next } : it)));
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const a = next[index];
    const b = next[j];
    if (!a || !b) return;
    next[index] = b;
    next[j] = a;
    setItems(next.map((it, i) => ({ ...it, order: i })));
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index).map((it, i) => ({ ...it, order: i })));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        to: '/',
        icon: 'link',
        visible: true,
        order: prev.length,
        labelEn: 'New card',

        descEn: '',
        descAr: '',
      },
    ]);
  }

  function handlePreview() {
    stageAndOpenPreview(
      'siteSetting',
      'quickLinks',
      {
        translations: { en: {} },
        data: { items: items.map((it, i) => ({ ...it, order: i })) },
      },
      '/',
    );
  }

  async function save() {
    setError(null);
    for (const it of items) {
      const err = validatePath(it.to);
      if (err) {
        setError(`"${it.labelEn || 'Untitled'}" → ${err}`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveSiteSetting('quickLinks', {
        translations: { en: {} },
        data: { items: items.map((it, i) => ({ ...it, order: i })) },
      });
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'quickLinks'] });
      await qc.invalidateQueries({ queryKey: ['content', 'siteSettings', 'quickLinks'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">Quick links</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">quickLinks</span> · The four cards at
            the bottom of the homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          title="Open the public page with unsaved changes"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          {items.length === 0 && (
            <div className="border-primary-100 bg-primary-50/30 text-ink/50 rounded-lg border border-dashed p-4 text-center text-xs italic">
              No cards. Click "Add card" to create one.
            </div>
          )}
          <ul className="space-y-3">
            {items.map((it, i) => {
              const pathError = validatePath(it.to);
              return (
                <li
                  key={`${it.to}-${i}`}
                  className="border-primary-100 bg-paper/30 rounded-lg border p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-ink/50 text-xs font-medium uppercase tracking-wide">
                      Card {i + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1}
                        className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-sienna hover:bg-sienna/10 rounded p-1"
                        aria-label="Remove card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-ink/70 block text-xs font-medium">Label</span>
                      <input
                        type="text"
                        value={it.labelEn}
                        onChange={(e) => patch(i, { labelEn: e.target.value })}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="text-ink/70 block text-xs font-medium">Description</span>
                      <textarea
                        value={it.descEn}
                        onChange={(e) => patch(i, { descEn: e.target.value })}
                        rows={2}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="text-ink/70 block text-xs font-medium">Icon</span>
                      <select
                        value={it.icon}
                        onChange={(e) => patch(i, { icon: e.target.value as QuickLinkIcon })}
                        className={inputCls}
                      >
                        {QUICK_LINK_ICON_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-ink/70 block text-xs font-medium">Path</span>
                      <input
                        type="text"
                        value={it.to}
                        onChange={(e) => patch(i, { to: e.target.value })}
                        placeholder="/faq"
                        className={
                          inputCls +
                          ' font-mono text-xs' +
                          (pathError ? 'border-sienna focus:border-sienna focus:ring-sienna' : '')
                        }
                      />
                      {pathError && <p className="text-sienna mt-1 text-xs">{pathError}</p>}
                    </label>
                    <label className="inline-flex items-center gap-2 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={it.visible}
                        onChange={(e) => patch(i, { visible: e.target.checked })}
                      />
                      <span className="text-ink/60 text-xs">
                        {it.visible ? 'Visible on homepage' : 'Hidden'}
                      </span>
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          <div>
            <button
              type="button"
              onClick={addItem}
              className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add card
            </button>
          </div>

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

// ---------- Footer-nav card ----------

/**
 * `FooterNavCard` — edits the footer's four navigation columns. Each column
 * has EN/AR titles and an ordered list of links; each link has EN/AR labels,
 * a `to` path, and an `external` checkbox that flips the renderer from
 * `<Link>` to a new-tab `<a>`. Columns and links both reorder; external
 * links skip the canonical-path validator because they're full URLs.
 */
function FooterNavCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'footerNav'],
    queryFn: () => getSiteSetting('footerNav'),
  });

  const [columns, setColumns] = useState<FooterNavColumn[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const docCols = (doc?.data as FooterNavData | undefined)?.columns;
    const seed = docCols && docCols.length > 0 ? docCols : DEFAULT_FOOTER_NAV;
    const sorted = [...seed].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setColumns(sorted.map((c, i) => ({ ...c, order: i })));
  }, [query.data, query.isLoading]);

  function patchColumn(ci: number, next: Partial<FooterNavColumn>) {
    setColumns((prev) => prev.map((c, i) => (i === ci ? { ...c, ...next } : c)));
  }

  function moveColumn(ci: number, dir: -1 | 1) {
    const j = ci + dir;
    if (j < 0 || j >= columns.length) return;
    const next = [...columns];
    const a = next[ci];
    const b = next[j];
    if (!a || !b) return;
    next[ci] = b;
    next[j] = a;
    setColumns(next.map((c, i) => ({ ...c, order: i })));
  }

  function removeColumn(ci: number) {
    setColumns((prev) => prev.filter((_, i) => i !== ci).map((c, i) => ({ ...c, order: i })));
  }

  function addColumn() {
    setColumns((prev) => [
      ...prev,
      {
        id: `col-${prev.length + 1}`,
        titleEn: 'New column',
        titleAr: '',
        order: prev.length,
        links: [],
      },
    ]);
  }

  function patchLink(ci: number, li: number, next: Partial<FooterNavColumn['links'][number]>) {
    setColumns((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, links: c.links.map((l, j) => (j === li ? { ...l, ...next } : l)) } : c,
      ),
    );
  }

  function moveLink(ci: number, li: number, dir: -1 | 1) {
    setColumns((prev) =>
      prev.map((c, i) => {
        if (i !== ci) return c;
        const j = li + dir;
        if (j < 0 || j >= c.links.length) return c;
        const links = [...c.links];
        const a = links[li];
        const b = links[j];
        if (!a || !b) return c;
        links[li] = b;
        links[j] = a;
        return { ...c, links };
      }),
    );
  }

  function removeLink(ci: number, li: number) {
    setColumns((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, links: c.links.filter((_, j) => j !== li) } : c)),
    );
  }

  function addLink(ci: number) {
    setColumns((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              links: [...c.links, { to: '/', labelEn: 'New link', external: false }],
            }
          : c,
      ),
    );
  }

  function buildFooterPayload() {
    return {
      translations: { en: {} },
      data: {
        columns: columns.map((c, i) => ({
          ...c,
          order: i,
          links: c.links.map((l) => ({
            to: l.to,
            labelEn: l.labelEn,

            ...(l.external ? { external: true } : {}),
          })),
        })),
      },
    };
  }

  function handlePreview() {
    stageAndOpenPreview('siteSetting', 'footerNav', buildFooterPayload(), '/');
  }

  async function save() {
    setError(null);
    for (const c of columns) {
      for (const l of c.links) {
        if (l.external) continue; // external URLs are not locale-prefixed paths
        const err = validatePath(l.to);
        if (err) {
          setError(`"${c.titleEn || c.id}" → "${l.labelEn || l.to}" → ${err}`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      await saveSiteSetting('footerNav', {
        translations: { en: {} },
        data: {
          columns: columns.map((c, i) => ({
            ...c,
            order: i,
            links: c.links.map((l) => ({
              to: l.to,
              labelEn: l.labelEn,

              ...(l.external ? { external: true } : {}),
            })),
          })),
        },
      });
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'footerNav'] });
      await qc.invalidateQueries({ queryKey: ['content', 'siteSettings', 'footerNav'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">Footer navigation</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">footerNav</span> · The link columns in
            the site footer.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          title="Open the public page with unsaved changes"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-5">
          {columns.length === 0 && (
            <div className="border-primary-100 bg-primary-50/30 text-ink/50 rounded-lg border border-dashed p-4 text-center text-xs italic">
              No columns. Click "Add column" to create one.
            </div>
          )}
          {columns.map((col, ci) => (
            <div
              key={`${col.id}-${ci}`}
              className="border-primary-100 bg-paper/30 rounded-lg border p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-ink/50 text-xs font-medium uppercase tracking-wide">
                  Column {ci + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveColumn(ci, -1)}
                    disabled={ci === 0}
                    className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                    aria-label="Move column up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(ci, 1)}
                    disabled={ci === columns.length - 1}
                    className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                    aria-label="Move column down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeColumn(ci)}
                    className="text-sienna hover:bg-sienna/10 rounded p-1"
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-ink/70 block text-xs font-medium">ID</span>
                  <input
                    type="text"
                    value={col.id}
                    onChange={(e) => patchColumn(ci, { id: e.target.value })}
                    className={inputCls + ' font-mono text-xs'}
                  />
                </label>
                <label className="block">
                  <span className="text-ink/70 block text-xs font-medium">Title</span>
                  <input
                    type="text"
                    value={col.titleEn}
                    onChange={(e) => patchColumn(ci, { titleEn: e.target.value })}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="mt-4">
                <h4 className="text-primary-700 mb-2 text-xs font-semibold uppercase tracking-wide">
                  Links
                </h4>
                <ul className="space-y-2">
                  {col.links.length === 0 && (
                    <li className="text-ink/50 text-xs italic">No links in this column.</li>
                  )}
                  {col.links.map((link, li) => {
                    const pathError = link.external ? null : validatePath(link.to);
                    return (
                      <li
                        key={`${link.to}-${li}`}
                        className="border-primary-100 rounded-md border bg-white p-3"
                      >
                        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                          <input
                            type="text"
                            value={link.labelEn}
                            onChange={(e) => patchLink(ci, li, { labelEn: e.target.value })}
                            placeholder="Label"
                            className={inputCls + ' mt-0'}
                          />
                          <div>
                            <input
                              type="text"
                              value={link.to}
                              onChange={(e) => patchLink(ci, li, { to: e.target.value })}
                              placeholder={link.external ? 'https://…' : '/about'}
                              className={
                                inputCls +
                                ' mt-0 font-mono text-xs' +
                                (pathError
                                  ? 'border-sienna focus:border-sienna focus:ring-sienna'
                                  : '')
                              }
                            />
                            {pathError && <p className="text-sienna mt-1 text-xs">{pathError}</p>}
                          </div>
                          <label className="text-ink/60 inline-flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={Boolean(link.external)}
                              onChange={(e) => patchLink(ci, li, { external: e.target.checked })}
                            />
                            Ext
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveLink(ci, li, -1)}
                              disabled={li === 0}
                              className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                              aria-label="Move link up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLink(ci, li, 1)}
                              disabled={li === col.links.length - 1}
                              className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                              aria-label="Move link down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLink(ci, li)}
                              className="text-sienna hover:bg-sienna/10 rounded p-1"
                              aria-label="Remove link"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => addLink(ci)}
                    className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add link
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div>
            <button
              type="button"
              onClick={addColumn}
              className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
            >
              <Plus className="h-3 w-3" />
              Add column
            </button>
          </div>

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

// ---------- ContactIntro card ----------

interface ContactIntroTranslations {
  eyebrow?: string;
  title: string;
  body: string;
}
interface ContactIntroFormLabels {
  name: string;
  email: string;
  message: string;
  submit: string;
  submittingLabel: string;
  successTitle: string;
  successBody: string;
  errorBody: string;
}
interface ContactIntroCardState {
  en: ContactIntroTranslations;
  labelsEn: ContactIntroFormLabels;
}

const EMPTY_CONTACT_LABELS: ContactIntroFormLabels = {
  name: '',
  email: '',
  message: '',
  submit: '',
  submittingLabel: '',
  successTitle: '',
  successBody: '',
  errorBody: '',
};

function ContactIntroCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'contactIntro'],
    queryFn: () => getSiteSetting('contactIntro'),
  });
  const defaults = DEFAULT_SITE_SETTINGS.find((d) => d.id === 'contactIntro');

  const [state, setState] = useState<ContactIntroCardState>({
    en: { eyebrow: '', title: '', body: '' },
    labelsEn: EMPTY_CONTACT_LABELS,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const enDoc = (doc?.translations?.en ?? {}) as unknown as Partial<ContactIntroTranslations>;
    const enDef = (defaults?.translations?.en ??
      {}) as unknown as Partial<ContactIntroTranslations>;
    const docLabels = (doc?.data?.formLabels ?? {}) as Record<'en', ContactIntroFormLabels>;
    const defLabels = (defaults?.data?.formLabels ?? {}) as Record<'en', ContactIntroFormLabels>;
    const baseEn: ContactIntroTranslations = { title: '', body: '' };
    setState({
      en: { ...baseEn, ...enDef, ...enDoc },
      labelsEn: { ...EMPTY_CONTACT_LABELS, ...defLabels.en, ...docLabels.en },
    });
  }, [query.data, query.isLoading, defaults]);

  function patchCopy(key: keyof ContactIntroTranslations, value: string) {
    setState((s) => ({ ...s, en: { ...s.en, [key]: value } }));
  }
  function patchLabel(key: keyof ContactIntroFormLabels, value: string) {
    setState((s) => ({ ...s, labelsEn: { ...s.labelsEn, [key]: value } }));
  }

  function buildContactPayload() {
    return {
      translations: {
        en: state.en,
      },
      data: {
        formLabels: {
          en: state.labelsEn,
        },
      },
    };
  }

  function handlePreview() {
    stageAndOpenPreview('siteSetting', 'contactIntro', buildContactPayload(), '/contact');
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const payload = buildContactPayload();
      await saveSiteSetting('contactIntro', payload);
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'contactIntro'] });
      await qc.invalidateQueries({ queryKey: ['public', 'siteSetting', 'contactIntro'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">Contact page intro + form labels</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">contactIntro</span> · Copy + form labels
            on /contact.
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
        </div>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-5">
          <ContactIntroPane
            copy={state.en}
            labels={state.labelsEn}
            onCopy={patchCopy}
            onLabel={patchLabel}
          />

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

function ContactIntroPane({
  copy,
  labels,
  onCopy,
  onLabel,
}: {
  copy: ContactIntroTranslations;
  labels: ContactIntroFormLabels;
  onCopy: (k: keyof ContactIntroTranslations, v: string) => void;
  onLabel: (k: keyof ContactIntroFormLabels, v: string) => void;
}) {
  const labelFields: Array<{ k: keyof ContactIntroFormLabels; l: string }> = [
    { k: 'name', l: 'Name field label' },
    { k: 'email', l: 'Email field label' },
    { k: 'message', l: 'Message field label' },
    { k: 'submit', l: 'Submit button label' },
    { k: 'submittingLabel', l: 'Submitting label' },
    { k: 'successTitle', l: 'Success title' },
    { k: 'successBody', l: 'Success body' },
    { k: 'errorBody', l: 'Error body' },
  ];
  return (
    <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Eyebrow (optional)</span>
          <input
            type="text"
            value={copy.eyebrow ?? ''}
            onChange={(e) => onCopy('eyebrow', e.target.value)}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Title</span>
          <input
            type="text"
            value={copy.title ?? ''}
            onChange={(e) => onCopy('title', e.target.value)}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Body</span>
          <textarea
            value={copy.body ?? ''}
            onChange={(e) => onCopy('body', e.target.value)}
            rows={3}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
        <div className="border-primary-100 mt-4 border-t pt-3">
          <div className="text-ink/60 mb-2 text-xs font-semibold uppercase">Form labels</div>
          <div className="space-y-2">
            {labelFields.map((f) => (
              <label key={f.k} className="block">
                <span className="text-ink/70 block text-xs font-medium">{f.l}</span>
                <input
                  type="text"
                  value={labels[f.k] ?? ''}
                  onChange={(e) => onLabel(f.k, e.target.value)}
                  dir="ltr"
                  lang="en"
                  className={inputCls}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- NotFound card ----------

interface NotFoundTranslations {
  eyebrow: string;
  title: string;
  body: string;
}

function NotFoundCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'notFound'],
    queryFn: () => getSiteSetting('notFound'),
  });
  const defaults = DEFAULT_SITE_SETTINGS.find((d) => d.id === 'notFound');

  const [en, setEn] = useState<NotFoundTranslations>({ eyebrow: '', title: '', body: '' });
  const [links, setLinks] = useState<NotFoundPopularLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const defTr = (defaults?.translations ?? {}) as {
      en?: NotFoundTranslations;
    };
    const docTr = (doc?.translations ?? {}) as {
      en?: NotFoundTranslations;
    };
    setEn({ eyebrow: '', title: '', body: '', ...defTr.en, ...docTr.en });
    const data = (doc?.data ?? defaults?.data) as NotFoundData | undefined;
    setLinks(data?.popularLinks ?? []);
  }, [query.data, query.isLoading, defaults]);

  function moveLink(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setLinks(next);
  }
  function removeLink(i: number) {
    setLinks(links.filter((_, idx) => idx !== i));
  }
  function addLink() {
    setLinks([...links, { to: '/', labelEn: '', hintEn: '' }]);
  }
  function patchLink(i: number, key: keyof NotFoundPopularLink, value: string) {
    setLinks(links.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  }

  function buildNotFoundPayload() {
    return {
      translations: {
        en,
      },
      data: { popularLinks: links },
    };
  }

  function handlePreview() {
    stageAndOpenPreview('siteSetting', 'notFound', buildNotFoundPayload(), '/__preview-404');
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await saveSiteSetting('notFound', buildNotFoundPayload());
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'notFound'] });
      await qc.invalidateQueries({ queryKey: ['public', 'siteSetting', 'notFound'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">404 page</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">notFound</span> · Copy + popular links
            on the 404 page.
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
        </div>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-5">
          <NotFoundLocalePane copy={en} onChange={setEn} />

          <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-primary-700 text-sm font-semibold uppercase tracking-wide">
                Popular links
              </h3>
              <button
                type="button"
                onClick={addLink}
                className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add link
              </button>
            </div>
            <ul className="space-y-3">
              {links.map((l, i) => (
                <li
                  key={i}
                  className="border-primary-100 grid gap-2 rounded-md border bg-white p-3 md:grid-cols-3"
                >
                  <label className="block md:col-span-1">
                    <span className="text-ink/60 block text-xs">Path (to)</span>
                    <input
                      type="text"
                      value={l.to}
                      onChange={(e) => patchLink(i, 'to', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block md:col-span-1">
                    <span className="text-ink/60 block text-xs">Label</span>
                    <input
                      type="text"
                      value={l.labelEn}
                      onChange={(e) => patchLink(i, 'labelEn', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block md:col-span-1">
                    <span className="text-ink/60 block text-xs">Hint</span>
                    <input
                      type="text"
                      value={l.hintEn}
                      onChange={(e) => patchLink(i, 'hintEn', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <div className="flex items-center gap-1 md:col-span-3 md:justify-end">
                    <button
                      type="button"
                      onClick={() => moveLink(i, -1)}
                      disabled={i === 0}
                      className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(i, 1)}
                      disabled={i === links.length - 1}
                      className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="text-sienna hover:bg-sienna/10 rounded p-1"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {links.length === 0 && (
                <li className="text-ink/50 text-xs italic">No popular links yet.</li>
              )}
            </ul>
          </div>

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

function NotFoundLocalePane({
  copy,
  onChange,
}: {
  copy: NotFoundTranslations;
  onChange: (next: NotFoundTranslations) => void;
}) {
  return (
    <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Eyebrow</span>
          <input
            type="text"
            value={copy.eyebrow}
            onChange={(e) => onChange({ ...copy, eyebrow: e.target.value })}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Title</span>
          <input
            type="text"
            value={copy.title}
            onChange={(e) => onChange({ ...copy, title: e.target.value })}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-ink/70 block text-xs font-medium">Body</span>
          <textarea
            value={copy.body}
            onChange={(e) => onChange({ ...copy, body: e.target.value })}
            rows={3}
            dir="ltr"
            lang="en"
            className={inputCls}
          />
        </label>
      </div>
    </div>
  );
}

// ---------- HomepageSections card ----------

const HOMEPAGE_SECTION_LABELS: Record<HomepageSectionId, string> = {
  hero: 'Hero',
  featured: 'Featured article',
  learnRow: 'Learn row',
  quranBanner: "Qur'an banner",
  quickLinks: 'Quick links',
  aboutPreview: 'About preview',
};

const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { id: 'hero', visible: true, order: 0 },
  { id: 'featured', visible: true, order: 1 },
  { id: 'learnRow', visible: true, order: 2 },
  { id: 'quranBanner', visible: true, order: 3 },
  { id: 'quickLinks', visible: true, order: 4 },
  { id: 'aboutPreview', visible: true, order: 5 },
];

function HomepageSectionsCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'homepageSections'],
    queryFn: () => getSiteSetting('homepageSections'),
  });

  const [sections, setSections] = useState<HomepageSection[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const data = (query.data?.data as HomepageSectionsData | undefined) ?? undefined;
    const existing = data?.sections;
    if (existing && existing.length > 0) {
      const sorted = [...existing].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const known = new Set(sorted.map((s) => s.id));
      const merged = [...sorted];
      for (const d of DEFAULT_HOMEPAGE_SECTIONS) {
        if (!known.has(d.id)) merged.push({ ...d, order: merged.length });
      }
      setSections(merged.map((s, i) => ({ ...s, order: i })));
    } else {
      setSections(DEFAULT_HOMEPAGE_SECTIONS);
    }
  }, [query.data, query.isLoading]);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setSections(next.map((s, idx) => ({ ...s, order: idx })));
  }

  function toggle(i: number) {
    setSections(sections.map((s, idx) => (idx === i ? { ...s, visible: !s.visible } : s)));
  }

  function handlePreview() {
    stageAndOpenPreview(
      'siteSetting',
      'homepageSections',
      {
        translations: { en: {} },
        data: { sections: sections.map((s, i) => ({ ...s, order: i })) },
      },
      '/',
    );
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await saveSiteSetting('homepageSections', {
        translations: { en: {} },
        data: { sections: sections.map((s, i) => ({ ...s, order: i })) },
      });
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'homepageSections'] });
      await qc.invalidateQueries({ queryKey: ['public', 'siteSetting', 'homepageSections'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">
            Homepage section order + visibility
          </h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">homepageSections</span> · Reorder or
            hide each section.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          title="Open the public page with unsaved changes"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-5">
          <ul className="space-y-2">
            {sections.map((s, i) => (
              <li
                key={s.id}
                className="border-primary-100 flex items-center justify-between gap-2 rounded-md border bg-white px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={s.visible} onChange={() => toggle(i)} />
                    <span className={s.visible ? 'text-ink' : 'text-ink/40 line-through'}>
                      {HOMEPAGE_SECTION_LABELS[s.id]}
                    </span>
                  </label>
                  <span className="text-ink/40 font-mono text-xs">{s.id}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === sections.length - 1}
                    className="text-ink/60 hover:bg-primary-50 hover:text-primary-700 rounded p-1 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

// ---------- Featured card ----------

function FeaturedCard({ articles }: { articles: AdminArticleV2[] }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'featured'],
    queryFn: () => getSiteSetting('featured'),
  });

  const [mode, setMode] = useState<'newest' | 'manual'>('newest');
  const [articleSlug, setArticleSlug] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const data = query.data?.data as FeaturedData | undefined;
    setMode(data?.mode ?? 'newest');
    setArticleSlug(data?.articleSlug ?? '');
  }, [query.data, query.isLoading]);

  function buildFeaturedPayload() {
    const data: Record<string, unknown> =
      mode === 'manual' && articleSlug ? { mode, articleSlug } : { mode: 'newest' };
    return {
      translations: { en: {} },
      data,
    };
  }

  function handlePreview() {
    stageAndOpenPreview('siteSetting', 'featured', buildFeaturedPayload(), '/');
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await saveSiteSetting('featured', buildFeaturedPayload());
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'featured'] });
      await qc.invalidateQueries({ queryKey: ['public', 'siteSetting', 'featured'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">Featured article</h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">featured</span> · Choose the article
            shown in the Featured slot.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          title="Open the public page with unsaved changes"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="featured-mode"
                checked={mode === 'newest'}
                onChange={() => setMode('newest')}
              />
              <span>Newest (latest published article)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="featured-mode"
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
              />
              <span>Manual — pick an article</span>
            </label>
          </div>

          {mode === 'manual' && (
            <label className="block">
              <span className="text-ink/70 block text-xs font-medium">Article</span>
              <select
                value={articleSlug}
                onChange={(e) => setArticleSlug(e.target.value)}
                className={inputCls + ' max-w-md'}
              >
                <option value="">— select an article —</option>
                {articles.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.translations?.en?.title ?? a.slug} ({a.slug})
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

// ---------- SEO card ----------

interface SeoRouteEntry extends SeoRouteOverride {
  path: string;
}

function SeoCard() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'siteSetting', 'seo'],
    queryFn: () => getSiteSetting('seo'),
  });
  const defaults = DEFAULT_SITE_SETTINGS.find((d) => d.id === 'seo');

  const [titleSuffix, setTitleSuffix] = useState('');
  const [descEn, setDescEn] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [routes, setRoutes] = useState<SeoRouteEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const data = (query.data?.data ?? defaults?.data) as SeoData | undefined;
    const d = data?.defaults;
    setTitleSuffix(d?.titleSuffix ?? 'The Straight Path');
    setDescEn(d?.defaultDescriptionEn ?? '');
    setOgImage(d?.defaultOgImageUrl ?? '');
    const entries = Object.entries(data?.routes ?? {}).map(([path, v]) => ({
      path,
      titleEn: v.titleEn,
      descriptionEn: v.descriptionEn,
    }));
    setRoutes(entries);
  }, [query.data, query.isLoading, defaults]);

  function addRoute() {
    setRoutes([...routes, { path: '/', titleEn: '', descriptionEn: '' }]);
  }
  function removeRoute(i: number) {
    setRoutes(routes.filter((_, idx) => idx !== i));
  }
  function patchRoute(i: number, key: keyof SeoRouteEntry, value: string) {
    setRoutes(routes.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  function buildSeoPayload() {
    const routesMap: Record<string, SeoRouteOverride> = {};
    for (const r of routes) {
      if (!r.path) continue;
      const entry: SeoRouteOverride = {};
      if (r.titleEn) entry.titleEn = r.titleEn;
      if (r.descriptionEn) entry.descriptionEn = r.descriptionEn;
      routesMap[r.path] = entry;
    }
    const data: SeoData = {
      defaults: {
        titleSuffix,
        defaultDescriptionEn: descEn,
        defaultOgImageUrl: ogImage,
      },
      routes: routesMap,
    };
    return {
      translations: { en: {} },
      data: data as unknown as Record<string, unknown>,
    };
  }

  function handlePreview() {
    stageAndOpenPreview('siteSetting', 'seo', buildSeoPayload(), '/');
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await saveSiteSetting('seo', buildSeoPayload());
      await qc.invalidateQueries({ queryKey: ['admin', 'siteSetting', 'seo'] });
      await qc.invalidateQueries({ queryKey: ['public', 'siteSetting', 'seo'] });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-primary-700 font-serif text-xl">
            SEO defaults + per-route overrides
          </h2>
          <p className="text-ink/60 mt-0.5 text-sm">
            <span className="text-ink/50 font-mono text-xs">seo</span> · Site-wide SEO defaults and
            optional per-route overrides.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          title="Open the public page with unsaved changes"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </header>

      {query.isLoading ? (
        <div className="text-ink/50 text-sm">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
            <h3 className="text-primary-700 mb-3 text-sm font-semibold uppercase tracking-wide">
              Defaults
            </h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-ink/70 block text-xs font-medium">Title suffix</span>
                <input
                  type="text"
                  value={titleSuffix}
                  onChange={(e) => setTitleSuffix(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="text-ink/70 block text-xs font-medium">Default description</span>
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="text-ink/70 block text-xs font-medium">Default OG image URL</span>
                <input
                  type="url"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          <div className="border-primary-100 bg-paper/30 rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-primary-700 text-sm font-semibold uppercase tracking-wide">
                Per-route overrides
              </h3>
              <button
                type="button"
                onClick={addRoute}
                className="border-primary-200 text-primary-700 hover:bg-primary-50 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"
              >
                <Plus className="h-3 w-3" />
                Add override
              </button>
            </div>
            <ul className="space-y-3">
              {routes.map((r, i) => (
                <li
                  key={i}
                  className="border-primary-100 grid gap-2 rounded-md border bg-white p-3"
                >
                  <label className="block">
                    <span className="text-ink/60 block text-xs">Canonical path (e.g. /learn)</span>
                    <input
                      type="text"
                      value={r.path}
                      onChange={(e) => patchRoute(i, 'path', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="block">
                      <span className="text-ink/60 block text-xs">Title</span>
                      <input
                        type="text"
                        value={r.titleEn ?? ''}
                        onChange={(e) => patchRoute(i, 'titleEn', e.target.value)}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="text-ink/60 block text-xs">Description</span>
                      <textarea
                        value={r.descriptionEn ?? ''}
                        onChange={(e) => patchRoute(i, 'descriptionEn', e.target.value)}
                        rows={2}
                        className={inputCls}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRoute(i)}
                      className="text-sienna hover:bg-sienna/10 rounded p-1"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {routes.length === 0 && (
                <li className="text-ink/50 text-xs italic">No per-route overrides yet.</li>
              )}
            </ul>
          </div>

          {error && (
            <div className="border-sienna/30 bg-sienna/5 text-sienna rounded-lg border px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {savedAt && !saving && (
              <span className="text-sage text-xs">
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="bg-primary-500 hover:bg-primary-600 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
