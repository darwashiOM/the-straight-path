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
        <p className="text-sm text-ink/70">
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
  const [arVal, setArVal] = useState<BrandTranslations>({ siteName: '', tagline: '' });
  const [arEnabled, setArEnabled] = useState(false);
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
    const defAr = DEFAULT_BRAND_SETTING.translations.ar;
    const defData = (DEFAULT_BRAND_SETTING.data ?? {}) as BrandData;
    const docEn = doc?.translations?.en ?? ({} as BrandTranslations);
    const docAr = doc?.translations?.ar;
    const docData = (doc?.data ?? {}) as BrandData;
    setEnVal({
      siteName: docEn.siteName ?? defEn.siteName,
      tagline: docEn.tagline ?? defEn.tagline ?? '',
    });
    setArVal({
      siteName: docAr?.siteName ?? defAr?.siteName ?? '',
      tagline: docAr?.tagline ?? defAr?.tagline ?? '',
    });
    setArEnabled(Boolean(docAr) || Boolean(defAr));
    setLogoUrl(docData.logoUrl ?? defData.logoUrl ?? '');
    setOgImage(docData.ogImage ?? defData.ogImage ?? '');
  }, [query.data, query.isLoading]);

  function buildPayload() {
    const payload: {
      translations: { en: BrandTranslations; ar?: BrandTranslations };
      data?: Record<string, unknown>;
    } = {
      translations: {
        en: { siteName: enVal.siteName, tagline: enVal.tagline || undefined },
        ...(arEnabled
          ? { ar: { siteName: arVal.siteName, tagline: arVal.tagline || undefined } }
          : {}),
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">Brand</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">brand</span> · Site name, tagline,
            logo, and default OG image.
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
          {!arEnabled && (
            <button
              type="button"
              onClick={() => setArEnabled(true)}
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
            <BrandLocalePane
              locale="en"
              values={enVal}
              onChange={(patch) => setEnVal((v) => ({ ...v, ...patch }))}
            />
            {arEnabled ? (
              <BrandLocalePane
                locale="ar"
                values={arVal}
                onChange={(patch) => setArVal((v) => ({ ...v, ...patch }))}
              />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-primary-100 bg-primary-50/30 p-6 text-center text-sm text-ink/50">
                Arabic translation not yet provided. Click{' '}
                <span className="font-medium">Enable Arabic</span> to add one.
              </div>
            )}
          </div>

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
  locale,
  values,
  onChange,
}: {
  locale: 'en' | 'ar';
  values: BrandTranslations;
  onChange: (patch: Partial<BrandTranslations>) => void;
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
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Site name</span>
          <input
            type="text"
            value={values.siteName}
            onChange={(e) => onChange({ siteName: e.target.value })}
            dir={dir}
            lang={locale}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Tagline (optional)</span>
          <input
            type="text"
            value={values.tagline ?? ''}
            onChange={(e) => onChange({ tagline: e.target.value })}
            dir={dir}
            lang={locale}
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
    <div className="rounded-lg border border-primary-100 bg-paper/30 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          {label}
        </span>
        <button
          type="button"
          onClick={onOpenPicker}
          className="inline-flex items-center gap-1 rounded-md border border-primary-200 px-2 py-1 text-xs text-primary-700 hover:bg-primary-50"
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
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
      {value ? (
        <div className="mt-3 overflow-hidden rounded-md border border-primary-100 bg-white">
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
    <div className="rounded-lg border border-primary-100 bg-paper/40 p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
        Navbar preview
      </div>
      <div className="flex h-16 items-center gap-2 rounded-md border border-primary-500/10 bg-paper/80 px-4 font-serif text-xl font-semibold text-primary-700">
        {logoUrl ? (
          <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
        ) : (
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-accent-400" />
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
        labelAr: '',
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">Navigation items</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">navItems</span> · Reorder, rename,
            or hide the navbar links.
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
        <div className="text-sm text-ink/50">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-2 py-2 font-medium">Order</th>
                  <th className="px-2 py-2 font-medium">Label (EN)</th>
                  <th className="px-2 py-2 font-medium">Label (AR)</th>
                  <th className="px-2 py-2 font-medium">Path</th>
                  <th className="px-2 py-2 font-medium">Visible</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const pathError = validatePath(it.to);
                  return (
                    <tr key={`${it.key}-${i}`} className="border-t border-primary-100">
                      <td className="px-2 py-2 align-top">
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
                            disabled={i === items.length - 1}
                            className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
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
                          value={it.labelAr}
                          onChange={(e) => patch(i, { labelAr: e.target.value })}
                          dir="rtl"
                          lang="ar"
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
                            ' mt-0 font-mono text-xs ' +
                            (pathError ? 'border-sienna focus:border-sienna focus:ring-sienna' : '')
                          }
                        />
                        {pathError && (
                          <p className="mt-1 text-xs text-sienna">{pathError}</p>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={it.visible}
                            onChange={(e) => patch(i, { visible: e.target.checked })}
                          />
                          <span className="text-xs text-ink/60">
                            {it.visible ? 'Visible' : 'Hidden'}
                          </span>
                        </label>
                      </td>
                      <td className="px-2 py-2 align-top text-right">
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="rounded p-1 text-sienna hover:bg-sienna/10"
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
                    <td colSpan={6} className="px-2 py-4 text-center text-xs italic text-ink/50">
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
              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
            >
              <Plus className="h-3 w-3" />
              Add item
            </button>
          </div>

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
        labelAr: '',
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">Quick links</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">quickLinks</span> · The four cards
            at the bottom of the homepage.
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
        <div className="text-sm text-ink/50">Loading…</div>
      ) : (
        <div className="space-y-4">
          {items.length === 0 && (
            <div className="rounded-lg border border-dashed border-primary-100 bg-primary-50/30 p-4 text-center text-xs italic text-ink/50">
              No cards. Click "Add card" to create one.
            </div>
          )}
          <ul className="space-y-3">
            {items.map((it, i) => {
              const pathError = validatePath(it.to);
              return (
                <li
                  key={`${it.to}-${i}`}
                  className="rounded-lg border border-primary-100 bg-paper/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
                      Card {i + 1}
                    </span>
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
                        disabled={i === items.length - 1}
                        className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="rounded p-1 text-sienna hover:bg-sienna/10"
                        aria-label="Remove card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="block text-xs font-medium text-ink/70">Label (EN)</span>
                      <input
                        type="text"
                        value={it.labelEn}
                        onChange={(e) => patch(i, { labelEn: e.target.value })}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-ink/70">Label (AR)</span>
                      <input
                        type="text"
                        value={it.labelAr}
                        onChange={(e) => patch(i, { labelAr: e.target.value })}
                        dir="rtl"
                        lang="ar"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-ink/70">
                        Description (EN)
                      </span>
                      <textarea
                        value={it.descEn}
                        onChange={(e) => patch(i, { descEn: e.target.value })}
                        rows={2}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-ink/70">
                        Description (AR)
                      </span>
                      <textarea
                        value={it.descAr}
                        onChange={(e) => patch(i, { descAr: e.target.value })}
                        rows={2}
                        dir="rtl"
                        lang="ar"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs font-medium text-ink/70">Icon</span>
                      <select
                        value={it.icon}
                        onChange={(e) =>
                          patch(i, { icon: e.target.value as QuickLinkIcon })
                        }
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
                      <span className="block text-xs font-medium text-ink/70">Path</span>
                      <input
                        type="text"
                        value={it.to}
                        onChange={(e) => patch(i, { to: e.target.value })}
                        placeholder="/faq"
                        className={
                          inputCls +
                          ' font-mono text-xs ' +
                          (pathError
                            ? 'border-sienna focus:border-sienna focus:ring-sienna'
                            : '')
                        }
                      />
                      {pathError && (
                        <p className="mt-1 text-xs text-sienna">{pathError}</p>
                      )}
                    </label>
                    <label className="inline-flex items-center gap-2 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={it.visible}
                        onChange={(e) => patch(i, { visible: e.target.checked })}
                      />
                      <span className="text-xs text-ink/60">
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
              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
            >
              <Plus className="h-3 w-3" />
              Add card
            </button>
          </div>

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
    setColumns((prev) =>
      prev.filter((_, i) => i !== ci).map((c, i) => ({ ...c, order: i })),
    );
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
        i === ci
          ? { ...c, links: c.links.map((l, j) => (j === li ? { ...l, ...next } : l)) }
          : c,
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
      prev.map((c, i) =>
        i === ci ? { ...c, links: c.links.filter((_, j) => j !== li) } : c,
      ),
    );
  }

  function addLink(ci: number) {
    setColumns((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              links: [
                ...c.links,
                { to: '/', labelEn: 'New link', labelAr: '', external: false },
              ],
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
            labelAr: l.labelAr,
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
              labelAr: l.labelAr,
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">Footer navigation</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">footerNav</span> · The link columns
            in the site footer.
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
        <div className="text-sm text-ink/50">Loading…</div>
      ) : (
        <div className="space-y-5">
          {columns.length === 0 && (
            <div className="rounded-lg border border-dashed border-primary-100 bg-primary-50/30 p-4 text-center text-xs italic text-ink/50">
              No columns. Click "Add column" to create one.
            </div>
          )}
          {columns.map((col, ci) => (
            <div
              key={`${col.id}-${ci}`}
              className="rounded-lg border border-primary-100 bg-paper/30 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-ink/50">
                  Column {ci + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveColumn(ci, -1)}
                    disabled={ci === 0}
                    className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                    aria-label="Move column up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(ci, 1)}
                    disabled={ci === columns.length - 1}
                    className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                    aria-label="Move column down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeColumn(ci)}
                    className="rounded p-1 text-sienna hover:bg-sienna/10"
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="block text-xs font-medium text-ink/70">ID</span>
                  <input
                    type="text"
                    value={col.id}
                    onChange={(e) => patchColumn(ci, { id: e.target.value })}
                    className={inputCls + ' font-mono text-xs'}
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-ink/70">Title (EN)</span>
                  <input
                    type="text"
                    value={col.titleEn}
                    onChange={(e) => patchColumn(ci, { titleEn: e.target.value })}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-medium text-ink/70">Title (AR)</span>
                  <input
                    type="text"
                    value={col.titleAr}
                    onChange={(e) => patchColumn(ci, { titleAr: e.target.value })}
                    dir="rtl"
                    lang="ar"
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
                  Links
                </h4>
                <ul className="space-y-2">
                  {col.links.length === 0 && (
                    <li className="text-xs italic text-ink/50">No links in this column.</li>
                  )}
                  {col.links.map((link, li) => {
                    const pathError = link.external ? null : validatePath(link.to);
                    return (
                      <li
                        key={`${link.to}-${li}`}
                        className="rounded-md border border-primary-100 bg-white p-3"
                      >
                        <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
                          <input
                            type="text"
                            value={link.labelEn}
                            onChange={(e) => patchLink(ci, li, { labelEn: e.target.value })}
                            placeholder="Label (EN)"
                            className={inputCls + ' mt-0'}
                          />
                          <input
                            type="text"
                            value={link.labelAr}
                            onChange={(e) => patchLink(ci, li, { labelAr: e.target.value })}
                            placeholder="Label (AR)"
                            dir="rtl"
                            lang="ar"
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
                                ' mt-0 font-mono text-xs ' +
                                (pathError
                                  ? 'border-sienna focus:border-sienna focus:ring-sienna'
                                  : '')
                              }
                            />
                            {pathError && (
                              <p className="mt-1 text-xs text-sienna">{pathError}</p>
                            )}
                          </div>
                          <label className="inline-flex items-center gap-1 text-xs text-ink/60">
                            <input
                              type="checkbox"
                              checked={Boolean(link.external)}
                              onChange={(e) =>
                                patchLink(ci, li, { external: e.target.checked })
                              }
                            />
                            Ext
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveLink(ci, li, -1)}
                              disabled={li === 0}
                              className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                              aria-label="Move link up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLink(ci, li, 1)}
                              disabled={li === col.links.length - 1}
                              className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                              aria-label="Move link down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLink(ci, li)}
                              className="rounded p-1 text-sienna hover:bg-sienna/10"
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
                    className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1 text-xs text-primary-700 hover:bg-primary-50"
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
              className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
            >
              <Plus className="h-3 w-3" />
              Add column
            </button>
          </div>

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
  ar: ContactIntroTranslations;
  arEnabled: boolean;
  labelsEn: ContactIntroFormLabels;
  labelsAr: ContactIntroFormLabels;
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
    ar: { eyebrow: '', title: '', body: '' },
    arEnabled: false,
    labelsEn: EMPTY_CONTACT_LABELS,
    labelsAr: EMPTY_CONTACT_LABELS,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const enDoc = (doc?.translations?.en ?? {}) as unknown as Partial<ContactIntroTranslations>;
    const arDoc = (doc?.translations?.ar ?? {}) as unknown as Partial<ContactIntroTranslations>;
    const enDef = (defaults?.translations?.en ?? {}) as unknown as Partial<ContactIntroTranslations>;
    const arDef = (defaults?.translations?.ar ?? {}) as unknown as Partial<ContactIntroTranslations>;
    const docLabels = (doc?.data?.formLabels ?? {}) as Record<'en' | 'ar', ContactIntroFormLabels>;
    const defLabels = (defaults?.data?.formLabels ?? {}) as Record<'en' | 'ar', ContactIntroFormLabels>;
    const baseEn: ContactIntroTranslations = { title: '', body: '' };
    const baseAr: ContactIntroTranslations = { title: '', body: '' };
    setState({
      en: { ...baseEn, ...enDef, ...enDoc },
      ar: { ...baseAr, ...arDef, ...arDoc },
      arEnabled: Boolean(doc?.translations?.ar) || Boolean(defaults?.translations?.ar),
      labelsEn: { ...EMPTY_CONTACT_LABELS, ...defLabels.en, ...docLabels.en },
      labelsAr: { ...EMPTY_CONTACT_LABELS, ...defLabels.ar, ...docLabels.ar },
    });
  }, [query.data, query.isLoading, defaults]);

  function patchCopy(which: 'en' | 'ar', key: keyof ContactIntroTranslations, value: string) {
    setState((s) => ({ ...s, [which]: { ...s[which], [key]: value } }));
  }
  function patchLabel(which: 'en' | 'ar', key: keyof ContactIntroFormLabels, value: string) {
    const k = which === 'en' ? 'labelsEn' : 'labelsAr';
    setState((s) => ({ ...s, [k]: { ...s[k], [key]: value } }));
  }

  function buildContactPayload() {
    return {
      translations: {
        en: state.en,
        ...(state.arEnabled ? { ar: state.ar } : {}),
      },
      data: {
        formLabels: {
          en: state.labelsEn,
          ...(state.arEnabled ? { ar: state.labelsAr } : {}),
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">Contact page intro + form labels</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">contactIntro</span> · Copy + form labels on /contact.
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
            <ContactIntroPane
              locale="en"
              copy={state.en}
              labels={state.labelsEn}
              onCopy={(k, v) => patchCopy('en', k, v)}
              onLabel={(k, v) => patchLabel('en', k, v)}
            />
            {state.arEnabled ? (
              <ContactIntroPane
                locale="ar"
                copy={state.ar}
                labels={state.labelsAr}
                onCopy={(k, v) => patchCopy('ar', k, v)}
                onLabel={(k, v) => patchLabel('ar', k, v)}
              />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-primary-100 bg-primary-50/30 p-6 text-center text-sm text-ink/50">
                Arabic translation not yet provided.
              </div>
            )}
          </div>

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

function ContactIntroPane({
  locale,
  copy,
  labels,
  onCopy,
  onLabel,
}: {
  locale: 'en' | 'ar';
  copy: ContactIntroTranslations;
  labels: ContactIntroFormLabels;
  onCopy: (k: keyof ContactIntroTranslations, v: string) => void;
  onLabel: (k: keyof ContactIntroFormLabels, v: string) => void;
}) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
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
    <div className="rounded-lg border border-primary-100 bg-paper/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-700">
          {locale === 'en' ? 'English' : 'Arabic'}
        </h3>
        <span className="text-xs text-ink/40">{locale}</span>
      </div>
      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Eyebrow (optional)</span>
          <input
            type="text"
            value={copy.eyebrow ?? ''}
            onChange={(e) => onCopy('eyebrow', e.target.value)}
            dir={dir}
            lang={locale}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Title</span>
          <input
            type="text"
            value={copy.title ?? ''}
            onChange={(e) => onCopy('title', e.target.value)}
            dir={dir}
            lang={locale}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Body</span>
          <textarea
            value={copy.body ?? ''}
            onChange={(e) => onCopy('body', e.target.value)}
            rows={3}
            dir={dir}
            lang={locale}
            className={inputCls}
          />
        </label>
        <div className="mt-4 border-t border-primary-100 pt-3">
          <div className="mb-2 text-xs font-semibold uppercase text-ink/60">Form labels</div>
          <div className="space-y-2">
            {labelFields.map((f) => (
              <label key={f.k} className="block">
                <span className="block text-xs font-medium text-ink/70">{f.l}</span>
                <input
                  type="text"
                  value={labels[f.k] ?? ''}
                  onChange={(e) => onLabel(f.k, e.target.value)}
                  dir={dir}
                  lang={locale}
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
  const [ar, setAr] = useState<NotFoundTranslations>({ eyebrow: '', title: '', body: '' });
  const [arEnabled, setArEnabled] = useState(false);
  const [links, setLinks] = useState<NotFoundPopularLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.isLoading) return;
    const doc = query.data;
    const defTr = (defaults?.translations ?? {}) as {
      en?: NotFoundTranslations;
      ar?: NotFoundTranslations;
    };
    const docTr = (doc?.translations ?? {}) as {
      en?: NotFoundTranslations;
      ar?: NotFoundTranslations;
    };
    setEn({ eyebrow: '', title: '', body: '', ...defTr.en, ...docTr.en });
    setAr({ eyebrow: '', title: '', body: '', ...defTr.ar, ...docTr.ar });
    setArEnabled(Boolean(docTr.ar) || Boolean(defTr.ar));
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
    setLinks([...links, { to: '/', labelEn: '', labelAr: '', hintEn: '', hintAr: '' }]);
  }
  function patchLink(i: number, key: keyof NotFoundPopularLink, value: string) {
    setLinks(links.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  }

  function buildNotFoundPayload() {
    return {
      translations: {
        en,
        ...(arEnabled ? { ar } : {}),
      },
      data: { popularLinks: links },
    };
  }

  function handlePreview() {
    stageAndOpenPreview(
      'siteSetting',
      'notFound',
      buildNotFoundPayload(),
      '/__preview-404',
    );
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">404 page</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">notFound</span> · Copy + popular links on the 404 page.
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
          {!arEnabled && (
            <button
              type="button"
              onClick={() => setArEnabled(true)}
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
            <NotFoundLocalePane locale="en" copy={en} onChange={setEn} />
            {arEnabled ? (
              <NotFoundLocalePane locale="ar" copy={ar} onChange={setAr} />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-primary-100 bg-primary-50/30 p-6 text-center text-sm text-ink/50">
                Arabic translation not yet provided.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-primary-100 bg-paper/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-700">
                Popular links
              </h3>
              <button
                type="button"
                onClick={addLink}
                className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
              >
                <Plus className="h-3 w-3" />
                Add link
              </button>
            </div>
            <ul className="space-y-3">
              {links.map((l, i) => (
                <li
                  key={i}
                  className="grid gap-2 rounded-md border border-primary-100 bg-white p-3 md:grid-cols-5"
                >
                  <label className="block md:col-span-1">
                    <span className="block text-xs text-ink/60">Path (to)</span>
                    <input
                      type="text"
                      value={l.to}
                      onChange={(e) => patchLink(i, 'to', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block md:col-span-1">
                    <span className="block text-xs text-ink/60">Label (en)</span>
                    <input
                      type="text"
                      value={l.labelEn}
                      onChange={(e) => patchLink(i, 'labelEn', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block md:col-span-1">
                    <span className="block text-xs text-ink/60">Label (ar)</span>
                    <input
                      type="text"
                      value={l.labelAr}
                      onChange={(e) => patchLink(i, 'labelAr', e.target.value)}
                      dir="rtl"
                      className={inputCls}
                    />
                  </label>
                  <label className="block md:col-span-1">
                    <span className="block text-xs text-ink/60">Hint (en)</span>
                    <input
                      type="text"
                      value={l.hintEn}
                      onChange={(e) => patchLink(i, 'hintEn', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block md:col-span-1">
                    <span className="block text-xs text-ink/60">Hint (ar)</span>
                    <input
                      type="text"
                      value={l.hintAr}
                      onChange={(e) => patchLink(i, 'hintAr', e.target.value)}
                      dir="rtl"
                      className={inputCls}
                    />
                  </label>
                  <div className="flex items-center gap-1 md:col-span-5 md:justify-end">
                    <button
                      type="button"
                      onClick={() => moveLink(i, -1)}
                      disabled={i === 0}
                      className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(i, 1)}
                      disabled={i === links.length - 1}
                      className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="rounded p-1 text-sienna hover:bg-sienna/10"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {links.length === 0 && (
                <li className="text-xs italic text-ink/50">No popular links yet.</li>
              )}
            </ul>
          </div>

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

function NotFoundLocalePane({
  locale,
  copy,
  onChange,
}: {
  locale: 'en' | 'ar';
  copy: NotFoundTranslations;
  onChange: (next: NotFoundTranslations) => void;
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
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Eyebrow</span>
          <input
            type="text"
            value={copy.eyebrow}
            onChange={(e) => onChange({ ...copy, eyebrow: e.target.value })}
            dir={dir}
            lang={locale}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Title</span>
          <input
            type="text"
            value={copy.title}
            onChange={(e) => onChange({ ...copy, title: e.target.value })}
            dir={dir}
            lang={locale}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink/70">Body</span>
          <textarea
            value={copy.body}
            onChange={(e) => onChange({ ...copy, body: e.target.value })}
            rows={3}
            dir={dir}
            lang={locale}
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">Homepage section order + visibility</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">homepageSections</span> · Reorder or hide each section.
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
        <div className="text-sm text-ink/50">Loading…</div>
      ) : (
        <div className="space-y-5">
          <ul className="space-y-2">
            {sections.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border border-primary-100 bg-white px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s.visible}
                      onChange={() => toggle(i)}
                    />
                    <span className={s.visible ? 'text-ink' : 'text-ink/40 line-through'}>
                      {HOMEPAGE_SECTION_LABELS[s.id]}
                    </span>
                  </label>
                  <span className="font-mono text-xs text-ink/40">{s.id}</span>
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
                    disabled={i === sections.length - 1}
                    className="rounded p-1 text-ink/60 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">Featured article</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">featured</span> · Choose the article shown in the Featured slot.
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
        <div className="text-sm text-ink/50">Loading…</div>
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
              <span className="block text-xs font-medium text-ink/70">Article</span>
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
  const [descAr, setDescAr] = useState('');
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
    setDescAr(d?.defaultDescriptionAr ?? '');
    setOgImage(d?.defaultOgImageUrl ?? '');
    const entries = Object.entries(data?.routes ?? {}).map(([path, v]) => ({
      path,
      titleEn: v.titleEn,
      titleAr: v.titleAr,
      descriptionEn: v.descriptionEn,
      descriptionAr: v.descriptionAr,
    }));
    setRoutes(entries);
  }, [query.data, query.isLoading, defaults]);

  function addRoute() {
    setRoutes([...routes, { path: '/', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '' }]);
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
      if (r.titleAr) entry.titleAr = r.titleAr;
      if (r.descriptionEn) entry.descriptionEn = r.descriptionEn;
      if (r.descriptionAr) entry.descriptionAr = r.descriptionAr;
      routesMap[r.path] = entry;
    }
    const data: SeoData = {
      defaults: {
        titleSuffix,
        defaultDescriptionEn: descEn,
        defaultDescriptionAr: descAr,
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
    <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-primary-700">SEO defaults + per-route overrides</h2>
          <p className="mt-0.5 text-sm text-ink/60">
            <span className="font-mono text-xs text-ink/50">seo</span> · Site-wide SEO defaults and optional per-route overrides.
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
        <div className="text-sm text-ink/50">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-primary-100 bg-paper/30 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary-700">
              Defaults
            </h3>
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-ink/70">Title suffix</span>
                <input
                  type="text"
                  value={titleSuffix}
                  onChange={(e) => setTitleSuffix(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-ink/70">Default description (en)</span>
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  rows={2}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-ink/70">Default description (ar)</span>
                <textarea
                  value={descAr}
                  onChange={(e) => setDescAr(e.target.value)}
                  rows={2}
                  dir="rtl"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-ink/70">Default OG image URL</span>
                <input
                  type="url"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-primary-100 bg-paper/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-700">
                Per-route overrides
              </h3>
              <button
                type="button"
                onClick={addRoute}
                className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50"
              >
                <Plus className="h-3 w-3" />
                Add override
              </button>
            </div>
            <ul className="space-y-3">
              {routes.map((r, i) => (
                <li
                  key={i}
                  className="grid gap-2 rounded-md border border-primary-100 bg-white p-3"
                >
                  <label className="block">
                    <span className="block text-xs text-ink/60">Canonical path (e.g. /learn)</span>
                    <input
                      type="text"
                      value={r.path}
                      onChange={(e) => patchRoute(i, 'path', e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="block">
                      <span className="block text-xs text-ink/60">Title (en)</span>
                      <input
                        type="text"
                        value={r.titleEn ?? ''}
                        onChange={(e) => patchRoute(i, 'titleEn', e.target.value)}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-ink/60">Title (ar)</span>
                      <input
                        type="text"
                        value={r.titleAr ?? ''}
                        onChange={(e) => patchRoute(i, 'titleAr', e.target.value)}
                        dir="rtl"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-ink/60">Description (en)</span>
                      <textarea
                        value={r.descriptionEn ?? ''}
                        onChange={(e) => patchRoute(i, 'descriptionEn', e.target.value)}
                        rows={2}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-ink/60">Description (ar)</span>
                      <textarea
                        value={r.descriptionAr ?? ''}
                        onChange={(e) => patchRoute(i, 'descriptionAr', e.target.value)}
                        rows={2}
                        dir="rtl"
                        className={inputCls}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRoute(i)}
                      className="rounded p-1 text-sienna hover:bg-sienna/10"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {routes.length === 0 && (
                <li className="text-xs italic text-ink/50">No per-route overrides yet.</li>
              )}
            </ul>
          </div>

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
