#!/usr/bin/env node
/**
 * Exports every Firestore content collection into `content-export/` in
 * the repo so the CMS state is versioned alongside code. The nightly
 * GitHub Actions workflow runs this, opens a PR if anything changed,
 * and merges it on review.
 *
 *   - articles         → content-export/articles/<slug>.mdx
 *   - resources        → content-export/resources.json
 *   - faqs             → content-export/faqs.json
 *   - channels         → content-export/channels.json
 *   - series           → content-export/series.json
 *   - topics           → content-export/topics.json
 *   - siteSettings     → content-export/site-settings.json
 *   - pages            → content-export/pages.json
 *   - README.md        → disclaimer: auto-generated, not source of truth
 *
 * Output is *deterministic*: object keys are sorted, arrays use
 * consistent ordering (by `order` field when present, otherwise doc id),
 * and Firestore Timestamp values are serialised to ISO strings. This
 * keeps day-to-day diffs minimal — a meaningful PR means a real content
 * change, not a noisy key reorder.
 *
 * Auth: same contract as migrate-content-to-firestore.mjs —
 *   - Pass a service-account key path as argv[2]; OR
 *   - set GOOGLE_APPLICATION_CREDENTIALS to that path; OR
 *   - rely on application default credentials.
 *
 * Usage:
 *   node scripts/export-firestore-to-repo.mjs [/path/to/sa.json]
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const OUT_DIR = join(REPO, 'content-export');
const ARTICLES_OUT = join(OUT_DIR, 'articles');

// -------------------------------------------------------------------------
// Firebase Admin init (matches migrate-content-to-firestore.mjs)
// -------------------------------------------------------------------------

const keyArg = process.argv[2];
const keyEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const keyPath = keyArg || keyEnv;
const app = keyPath
  ? initializeApp({
      credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))),
      projectId: 'the-straight-path-tsp',
    })
  : initializeApp({
      credential: applicationDefault(),
      projectId: 'the-straight-path-tsp',
    });

const db = getFirestore(app);

// -------------------------------------------------------------------------
// Serialisation helpers
// -------------------------------------------------------------------------

/**
 * Recursively normalise a Firestore document so JSON.stringify produces
 * a stable, readable output:
 *   - Timestamp → ISO string
 *   - undefined → dropped
 *   - object keys → sorted alphabetically
 *   - arrays preserved in insertion order (callers may pre-sort)
 */
function normalise(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalise);
  if (typeof value === 'object') {
    // firebase-admin Timestamp-like shape when running under emulator
    if (typeof value.toDate === 'function' && typeof value.seconds === 'number') {
      return value.toDate().toISOString();
    }
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const v = normalise(value[key]);
      if (v === undefined) continue;
      out[key] = v;
    }
    return out;
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(normalise(value), null, 2) + '\n';
}

/**
 * Dump a collection into `{ <docId>: <data> }`, sorted by `order` then id.
 * Returns the ordered list so we write the JSON file with predictable keys.
 */
async function dumpCollection(name) {
  const snap = await db.collection(name).get();
  const rows = snap.docs
    .map((d) => ({ id: d.id, data: d.data() }))
    .sort((a, b) => {
      const oa = typeof a.data.order === 'number' ? a.data.order : Number.POSITIVE_INFINITY;
      const ob = typeof b.data.order === 'number' ? b.data.order : Number.POSITIVE_INFINITY;
      if (oa !== ob) return oa - ob;
      return a.id.localeCompare(b.id);
    });
  const out = {};
  for (const { id, data } of rows) out[id] = normalise(data);
  return { count: rows.length, rows, asMap: out };
}

// -------------------------------------------------------------------------
// Frontmatter writer for articles
// -------------------------------------------------------------------------

/**
 * Serialise a JS value as a YAML frontmatter scalar/list. Intentionally
 * small — we only handle the shapes we actually produce (strings, numbers,
 * booleans, string[]). Strings are always single-quoted after escaping
 * embedded single quotes (the YAML way: `'` becomes `''`).
 */
function yamlScalar(v) {
  if (v === null || v === undefined) return "''";
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // Always quote strings — safe for dates, slugs, etc.
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function yamlFrontmatter(obj) {
  const lines = ['---'];
  for (const key of Object.keys(obj).sort()) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${yamlScalar(item)}`);
        }
      }
      continue;
    }
    if (typeof value === 'object') {
      // We don't embed nested objects in frontmatter; JSON-encode as a
      // last resort so nothing is silently lost.
      lines.push(`${key}: ${yamlScalar(JSON.stringify(value))}`);
      continue;
    }
    lines.push(`${key}: ${yamlScalar(value)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function writeArticleMdx(slug, data) {
  const tr = data.translations || {};
  const en = tr.en || {};
  const ar = tr.ar || null;
  const fm = {
    slug,
    status: data.status || 'draft',
    publishedAt: data.publishedAt || '',
    author: data.author || '',
    tags: Array.isArray(data.tags) ? [...data.tags].sort() : [],
    title: en.title || '',
    excerpt: en.excerpt || '',
  };
  if (data.topic) fm.topic = data.topic;
  if (data.series) fm.series = data.series;
  if (data.heroImage) fm.heroImage = data.heroImage;
  if (data.scheduledAt) fm.scheduledAt = data.scheduledAt;
  if (ar && typeof ar.title === 'string') fm.ar_title = ar.title;
  if (ar && typeof ar.excerpt === 'string') fm.ar_excerpt = ar.excerpt;
  if (ar && typeof ar.body === 'string' && ar.body.length > 0) fm.ar_body = ar.body;

  const body = typeof en.body === 'string' ? en.body.trim() : '';
  const contents = `${yamlFrontmatter(fm)}\n\n${body}\n`;
  writeFileSync(join(ARTICLES_OUT, `${slug}.mdx`), contents);
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

const README = `# content-export/

This directory is **auto-generated** by
\`scripts/export-firestore-to-repo.mjs\`, which is run nightly by the
\`.github/workflows/content-export.yml\` workflow.

These files are a **snapshot** of the live Firestore CMS. They are
**not** the source of truth — editing them will not update the site.
To change content, edit it through the admin panel at \`/admin\`.

The snapshot exists so:

1. Content is versioned in git.
2. Diffs on PRs show exactly what editors changed, and when.
3. We have an offline, human-readable backup in the repo.

Layout:

- \`articles/<slug>.mdx\` — one file per article, frontmatter + English
  body. The Arabic body (if present) lives under the \`ar_body\`
  frontmatter key so the file is still a single-body MDX document.
- \`resources.json\`, \`faqs.json\`, \`channels.json\`, \`series.json\`,
  \`topics.json\`, \`site-settings.json\`, \`pages.json\` — one JSON file
  per collection, keyed by document id.

Output is deterministic (sorted keys, stable ordering) so day-to-day
diffs are minimal.
`;

async function exportArticles() {
  rmSync(ARTICLES_OUT, { recursive: true, force: true });
  mkdirSync(ARTICLES_OUT, { recursive: true });
  const snap = await db.collection('articles').get();
  const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() })).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const { id, data } of rows) {
    writeArticleMdx(id, data);
  }
  console.log(`  articles: ${rows.length}`);
}

async function exportSimple(collectionName, fileName) {
  const { count, asMap } = await dumpCollection(collectionName);
  writeFileSync(join(OUT_DIR, fileName), stableJson(asMap));
  console.log(`  ${collectionName}: ${count}`);
}

async function main() {
  console.log('Exporting the-straight-path-tsp Firestore → content-export/');
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'README.md'), README);

  await exportArticles();
  await exportSimple('resources', 'resources.json');
  await exportSimple('faqs', 'faqs.json');
  await exportSimple('channels', 'channels.json');
  await exportSimple('series', 'series.json');
  await exportSimple('topics', 'topics.json');
  await exportSimple('siteSettings', 'site-settings.json');
  await exportSimple('pages', 'pages.json');

  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
