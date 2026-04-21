#!/usr/bin/env node
/**
 * Seeds Firestore with every piece of content that currently lives in the
 * repo (MDX articles, hardcoded resource/FAQ/channel arrays, i18n JSON,
 * series + topic definitions, editorial page bodies).
 *
 * Idempotent: doc IDs are stable slugs; re-running merges changes rather
 * than duplicating. Safe to run repeatedly during development.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/migrate-content-to-firestore.mjs
 *
 * Or let the caller pass a key path explicitly:
 *   node scripts/migrate-content-to-firestore.mjs /path/to/sa.json
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const ARTICLES_DIR = join(REPO, 'apps', 'web', 'src', 'content', 'articles');
const LOCALES_DIR = join(REPO, 'apps', 'web', 'src', 'locales');

// -------------------------------------------------------------------------
// Firebase Admin init
// -------------------------------------------------------------------------

const keyArg = process.argv[2];
const keyEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const keyPath = keyArg || keyEnv;
const app = keyPath
  ? initializeApp({
      credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))),
      projectId: 'the-straight-path-tsp',
    })
  : initializeApp({ credential: applicationDefault(), projectId: 'the-straight-path-tsp' });

const db = getFirestore(app);
const SERVER_TS = FieldValue.serverTimestamp();

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Parse YAML frontmatter. Supports flat key: value pairs and
 *  `key:\n  - value` list shorthand used by our MDX files. */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  let currentKey = null;
  for (const line of m[1].split('\n')) {
    if (/^\s*-\s+/.test(line) && currentKey) {
      const val = line.replace(/^\s*-\s+/, '').trim().replace(/^['"]|['"]$/g, '');
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(val);
      continue;
    }
    const i = line.indexOf(':');
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!k) continue;
    currentKey = k;
    if (v === '') continue;
    fm[k] = v.replace(/^['"]|['"]$/g, '');
  }
  return { fm, body: raw.slice(m[0].length) };
}

function readLocale(name) {
  return JSON.parse(readFileSync(join(LOCALES_DIR, `${name}.json`), 'utf8'));
}

async function upsert(collection, id, data) {
  await db
    .collection(collection)
    .doc(id)
    .set({ ...data, updatedAt: SERVER_TS, createdAt: SERVER_TS, schemaVersion: 1 }, { merge: true });
}

// -------------------------------------------------------------------------
// Articles — read MDX + pull translated title/excerpt from locales
// -------------------------------------------------------------------------

async function migrateArticles() {
  const en = readLocale('en');
  const ar = readLocale('ar');
  const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx')).sort();
  let count = 0;
  for (const file of files) {
    const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    if (!fm.slug) continue;
    const slug = fm.slug;
    const enTr = en.articles?.[slug] ?? {};
    const arTr = ar.articles?.[slug] ?? {};
    const translations = {
      en: {
        title: enTr.title || fm.title,
        excerpt: enTr.excerpt || fm.excerpt,
        body: body.trim(),
      },
    };
    if (arTr.title || arTr.excerpt) {
      translations.ar = {
        title: arTr.title || fm.title,
        excerpt: arTr.excerpt || fm.excerpt,
        body: body.trim(), // No Arabic body yet; reuse English
      };
    }
    const doc = {
      slug,
      status: fm.draft === 'true' || fm.draft === true ? 'draft' : 'published',
      publishedAt: fm.publishedAt || new Date().toISOString().slice(0, 10),
      author: fm.author || 'The Straight Path',
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      topic: fm.topic || undefined,
      series: fm.series || undefined,
      heroImage: fm.heroImage || undefined,
      translations,
    };
    // Strip undefined (Firestore rejects explicit undefined).
    Object.keys(doc).forEach((k) => doc[k] === undefined && delete doc[k]);
    await upsert('articles', slug, doc);
    count++;
  }
  console.log(`  articles: ${count}`);
}

// -------------------------------------------------------------------------
// Resources / FAQs / Channels — hardcoded mapping, translations from locales
// -------------------------------------------------------------------------

const RESOURCE_SEEDS = [
  { id: 'quranCom', url: 'https://quran.com/', category: 'quran', order: 0 },
  { id: 'sunnahCom', url: 'https://sunnah.com/', category: 'hadith', order: 1 },
  { id: 'yaqeen', url: 'https://yaqeeninstitute.org/', category: 'research', order: 2 },
  { id: 'bayyinah', url: 'https://bayyinah.tv/', category: 'study', order: 3 },
  { id: 'islamicAwareness', url: 'https://www.islamic-awareness.org/', category: 'research', order: 4 },
];

const CHANNEL_SEEDS = [
  { id: 'efdawah', url: 'https://www.youtube.com/@EFDawah', order: 0 },
  { id: 'yaqeen', url: 'https://www.youtube.com/@YaqeenInstituteOfficial', order: 1 },
  { id: 'muftimenk', url: 'https://www.youtube.com/@muftimenkofficial', order: 2 },
];

async function migrateResources() {
  const en = readLocale('en');
  const ar = readLocale('ar');
  let count = 0;
  for (const r of RESOURCE_SEEDS) {
    const enEntry = en.resourcesPage?.items?.[r.id] ?? {};
    const arEntry = ar.resourcesPage?.items?.[r.id] ?? {};
    await upsert('resources', r.id, {
      url: r.url,
      category: r.category,
      order: r.order,
      translations: {
        en: { title: enEntry.title || r.id, description: enEntry.description || '' },
        ...(arEntry.title ? { ar: { title: arEntry.title, description: arEntry.description || '' } } : {}),
      },
    });
    count++;
  }
  console.log(`  resources: ${count}`);
}

async function migrateFaqs() {
  const en = readLocale('en');
  const ar = readLocale('ar');
  const enItems = en.faqPage?.items || [];
  const arItems = ar.faqPage?.items || [];
  let count = 0;
  for (let i = 0; i < enItems.length; i++) {
    const enItem = enItems[i];
    const arItem = arItems[i];
    const id = `f${i + 1}`;
    await upsert('faqs', id, {
      order: i,
      category: 'general',
      translations: {
        en: { question: enItem.q, answer: enItem.a },
        ...(arItem ? { ar: { question: arItem.q, answer: arItem.a } } : {}),
      },
    });
    count++;
  }
  console.log(`  faqs: ${count}`);
}

async function migrateChannels() {
  const en = readLocale('en');
  const ar = readLocale('ar');
  let count = 0;
  for (const c of CHANNEL_SEEDS) {
    const enKey = c.id === 'muftimenk' ? 'muftiMenk' : c.id;
    const enEntry = en.socialPage?.channels?.[enKey] ?? {};
    const arEntry = ar.socialPage?.channels?.[enKey] ?? {};
    await upsert('channels', c.id, {
      url: c.url,
      order: c.order,
      translations: {
        en: { name: enEntry.name || c.id, description: enEntry.description || '' },
        ...(arEntry.name ? { ar: { name: arEntry.name, description: arEntry.description || '' } } : {}),
      },
    });
    count++;
  }
  console.log(`  channels: ${count}`);
}

// -------------------------------------------------------------------------
// Series + Topics
// -------------------------------------------------------------------------

async function migrateSeries() {
  await upsert('series', 'foundations-of-islam', {
    slug: 'foundations-of-islam',
    order: 0,
    articleSlugs: [
      'what-is-islam',
      'why-did-god-create-you',
      'the-five-pillars',
      '10-things-to-know-about-islam',
    ],
    translations: {
      en: {
        title: 'Foundations of Islam',
        description:
          'Start at the beginning. A short reading order covering what Islam is, why we were created, the core practices, and a ten-point overview for the curious.',
      },
      ar: {
        title: 'أساسيات الإسلام',
        description:
          'ابدأ من البداية. ترتيب قراءة قصير يغطي ماهية الإسلام، ولماذا خُلقنا، والعبادات الأساسية، ونظرة عامة في عشر نقاط للمهتم.',
      },
    },
  });
  console.log(`  series: 1`);
}

async function migrateTopics() {
  const topics = [
    { slug: 'foundations', en: 'Foundations', ar: 'الأساسيات' },
    { slug: 'creed', en: 'Creed', ar: 'العقيدة' },
    { slug: 'quran', en: "Qur'an", ar: 'القرآن' },
    { slug: 'prophet', en: 'Prophet', ar: 'النبي ﷺ' },
    { slug: 'character', en: 'Character', ar: 'الأخلاق' },
    { slug: 'practice', en: 'Practice', ar: 'العبادة' },
    { slug: 'comparative-religion', en: 'Comparative Religion', ar: 'مقارنة الأديان' },
  ];
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i];
    await upsert('topics', t.slug, {
      slug: t.slug,
      order: i,
      translations: { en: { label: t.en }, ar: { label: t.ar } },
    });
  }
  console.log(`  topics: ${topics.length}`);
}

// -------------------------------------------------------------------------
// Site settings
// -------------------------------------------------------------------------

async function migrateSiteSettings() {
  const en = readLocale('en');
  const ar = readLocale('ar');

  const settings = [
    {
      id: 'hero',
      translations: {
        en: {
          eyebrow: en.home?.hero?.eyebrow || 'The Straight Path',
          title: en.home?.hero?.title || 'A Clear Path to God',
          subtitle: en.home?.hero?.subtitle || '',
          ctaPrimary: en.home?.hero?.ctaPrimary || 'Start Learning',
          ctaSecondary: en.home?.hero?.ctaSecondary || "Read the Qur'an",
        },
        ar: {
          eyebrow: ar.home?.hero?.eyebrow || '',
          title: ar.home?.hero?.title || '',
          subtitle: ar.home?.hero?.subtitle || '',
          ctaPrimary: ar.home?.hero?.ctaPrimary || '',
          ctaSecondary: ar.home?.hero?.ctaSecondary || '',
        },
      },
    },
    {
      id: 'quranBanner',
      translations: {
        en: {
          eyebrow: en.home?.sections?.quran || "Read the Qur'an",
          headline: en.home?.quranBanner?.headline || '',
          body: en.home?.quranBanner?.body || '',
          cta: en.home?.quranBanner?.cta || 'Open Quran.com',
          ctaUrl: 'https://quran.com/',
        },
        ar: {
          eyebrow: ar.home?.sections?.quran || '',
          headline: ar.home?.quranBanner?.headline || '',
          body: ar.home?.quranBanner?.body || '',
          cta: ar.home?.quranBanner?.cta || '',
          ctaUrl: 'https://quran.com/',
        },
      },
    },
    {
      id: 'aboutPreview',
      translations: {
        en: {
          eyebrow: en.home?.sections?.about || 'About Us',
          headline: en.home?.aboutPreview?.headline || '',
          body: en.home?.aboutPreview?.body || '',
          cta: en.home?.aboutPreview?.cta || 'Read more about our mission',
        },
        ar: {
          eyebrow: ar.home?.sections?.about || '',
          headline: ar.home?.aboutPreview?.headline || '',
          body: ar.home?.aboutPreview?.body || '',
          cta: ar.home?.aboutPreview?.cta || '',
        },
      },
    },
    {
      id: 'startHere',
      translations: {
        en: {
          eyebrow: en.learn?.startHere?.eyebrow || 'Start Here',
          title: en.learn?.startHere?.title || 'New to Islam? Start here.',
          body:
            en.learn?.startHere?.body ||
            'Three short articles, in order. Read them in one sitting, or one a day — whichever feels right.',
        },
        ar: {
          eyebrow: ar.learn?.startHere?.eyebrow || 'ابدأ من هنا',
          title: ar.learn?.startHere?.title || 'جديد على الإسلام؟ ابدأ من هنا.',
          body: ar.learn?.startHere?.body || '',
        },
      },
      data: {
        articleSlugs: [
          'what-is-islam',
          'why-did-god-create-you',
          '10-things-to-know-about-islam',
        ],
      },
    },
    {
      id: 'learnHeader',
      translations: {
        en: { title: en.learn?.title || 'Learn About Islam', description: en.learn?.description || '' },
        ar: { title: ar.learn?.title || '', description: ar.learn?.description || '' },
      },
    },
    {
      id: 'articlesHeader',
      translations: {
        en: { title: en.articlesPage?.title || 'Articles', description: en.articlesPage?.description || '' },
        ar: { title: ar.articlesPage?.title || '', description: ar.articlesPage?.description || '' },
      },
    },
    {
      id: 'quranAbout',
      translations: {
        en: {
          title: en.quranPage?.aboutTitle || "About the Qur'ān",
          body: [en.quranPage?.aboutBody1, en.quranPage?.aboutBody2].filter(Boolean).join('\n\n'),
        },
        ar: {
          title: ar.quranPage?.aboutTitle || '',
          body: [ar.quranPage?.aboutBody1, ar.quranPage?.aboutBody2].filter(Boolean).join('\n\n'),
        },
      },
    },
    {
      id: 'footer',
      translations: {
        en: {
          copyright: en.footer?.copyright || 'The Straight Path. All rights reserved.',
          madeWith: en.footer?.madeWith || 'Built with care and in service.',
        },
        ar: {
          copyright: ar.footer?.copyright || '',
          madeWith: ar.footer?.madeWith || '',
        },
      },
    },
  ];
  for (const s of settings) await upsert('siteSettings', s.id, s);
  console.log(`  siteSettings: ${settings.length}`);
}

// -------------------------------------------------------------------------
// Pages (About, Privacy, Terms)
// -------------------------------------------------------------------------

async function migratePages() {
  const en = readLocale('en');
  const ar = readLocale('ar');

  // About — assemble markdown from structured i18n fields.
  const aboutEnPrinciples = (en.aboutPage?.principles || [])
    .map((p) => `- **${p.label}** ${p.body}`)
    .join('\n');
  const aboutArPrinciples = (ar.aboutPage?.principles || [])
    .map((p) => `- **${p.label}** ${p.body}`)
    .join('\n');

  await upsert('pages', 'about', {
    slug: 'about',
    translations: {
      en: {
        title: en.aboutPage?.title || 'About The Straight Path',
        body: [
          en.aboutPage?.intro || '',
          `## ${en.aboutPage?.principlesTitle || 'Our principles'}`,
          aboutEnPrinciples,
          `## ${en.aboutPage?.fundingTitle || 'How we are funded'}`,
          en.aboutPage?.fundingBody || '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
      ar: {
        title: ar.aboutPage?.title || '',
        body: [
          ar.aboutPage?.intro || '',
          `## ${ar.aboutPage?.principlesTitle || ''}`,
          aboutArPrinciples,
          `## ${ar.aboutPage?.fundingTitle || ''}`,
          ar.aboutPage?.fundingBody || '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    },
  });

  // Privacy
  const privacyEn = en.privacyPage || {};
  const collectBullets = (privacyEn.collectItems || [])
    .map((i) => `- **${i.label}** ${i.body}`)
    .join('\n');
  const dontBullets = (privacyEn.whatWeDont || []).map((v) => `- ${v}`).join('\n');

  await upsert('pages', 'privacy', {
    slug: 'privacy',
    translations: {
      en: {
        title: privacyEn.title || 'Privacy Policy',
        body: [
          privacyEn.lastUpdated || 'Last updated: April 2026.',
          privacyEn.intro || '',
          `## ${privacyEn.collectTitle || 'What we collect'}`,
          collectBullets,
          `## ${privacyEn.whatWeDontTitle || "What we don't do"}`,
          dontBullets,
          `## ${privacyEn.rightsTitle || 'Your rights'}`,
          privacyEn.rightsBody || '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    },
  });

  // Terms
  const termsEn = en.termsPage || {};
  const termsItems = Array.isArray(termsEn.items)
    ? termsEn.items
    : termsEn.items && typeof termsEn.items === 'object'
      ? Object.values(termsEn.items)
      : [];
  const termsBullets = termsItems.map((v) => `- ${v}`).join('\n');
  await upsert('pages', 'terms', {
    slug: 'terms',
    translations: {
      en: {
        title: termsEn.title || 'Terms of Use',
        body: [
          termsEn.lastUpdated || 'Last updated: April 2026.',
          termsEn.intro || '',
          termsBullets,
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    },
  });

  console.log(`  pages: 3`);
}

// -------------------------------------------------------------------------
// Runner
// -------------------------------------------------------------------------

async function main() {
  console.log('Seeding the-straight-path-tsp Firestore…');
  await migrateTopics();
  await migrateSeries();
  await migrateArticles();
  await migrateResources();
  await migrateFaqs();
  await migrateChannels();
  await migrateSiteSettings();
  await migratePages();
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
