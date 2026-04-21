#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 *
 * Writes apps/web/public/sitemap.xml from:
 *   - apps/web/src/lib/routes.ts  (static routes with metadata)
 *   - apps/web/src/content/articles/*.mdx  (per-article URLs from frontmatter)
 *
 * Produces English + Arabic (/ar/...) entries with paired
 * <xhtml:link rel="alternate" hreflang="..." /> tags. Pure Node ESM, no deps.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ROUTES_TS = join(REPO_ROOT, 'apps', 'web', 'src', 'lib', 'routes.ts');
const ARTICLES_DIR = join(REPO_ROOT, 'apps', 'web', 'src', 'content', 'articles');
const OUT_PATH = join(REPO_ROOT, 'apps', 'web', 'public', 'sitemap.xml');

const SITE_ORIGIN = 'https://thestraightpath.app';

// -- Parse routes.ts without a TS transpiler ---------------------------------
// The file is a typed literal; we only need path / priority / changefreq /
// hasArabic / noindex. A tolerant regex pass is enough — this file is ours.
function parseRoutes() {
  const src = readFileSync(ROUTES_TS, 'utf8');
  const routesBlock = src.match(/export const routes:[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!routesBlock) throw new Error('Could not locate `routes` array in routes.ts');
  const body = routesBlock[1];

  const entries = [];
  // Split on top-level braces; each entry is `{ ... },`
  const rx = /\{([\s\S]*?)\},?/g;
  let m;
  while ((m = rx.exec(body)) !== null) {
    const block = m[1];
    const get = (key) => {
      const re = new RegExp(`${key}\\s*:\\s*(?:(['\\\`"])([^'\\\`"]*)\\1|([0-9.]+)|(true|false))`);
      const mm = block.match(re);
      if (!mm) return undefined;
      if (mm[2] !== undefined) return mm[2];
      if (mm[3] !== undefined) return Number(mm[3]);
      if (mm[4] !== undefined) return mm[4] === 'true';
      return undefined;
    };
    const path = get('path');
    if (!path) continue;
    entries.push({
      path,
      priority: get('priority') ?? 0.5,
      changefreq: get('changefreq') ?? 'monthly',
      noindex: get('noindex') === true,
      hasArabic: get('hasArabic') === true,
    });
  }
  return entries;
}

// -- Parse MDX frontmatter ---------------------------------------------------
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const val = line
      .slice(i + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (!key) continue;
    fm[key] = val;
  }
  return fm;
}

function readArticles() {
  const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'));
  const out = [];
  for (const file of files) {
    const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm || !fm.slug) continue;
    if (fm.draft === 'true' || fm.draft === true) continue;
    out.push({
      slug: fm.slug,
      publishedAt: fm.publishedAt || new Date().toISOString().slice(0, 10),
    });
  }
  return out;
}

// -- Build the sitemap -------------------------------------------------------
function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ path, priority, changefreq, lastmod, hasArabic }) {
  const enHref = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
  const arHref = `${SITE_ORIGIN}/ar${path === '/' ? '/' : path}`;
  const lines = [];
  lines.push('  <url>');
  lines.push(`    <loc>${xmlEscape(enHref)}</loc>`);
  if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`);
  lines.push(`    <changefreq>${xmlEscape(changefreq)}</changefreq>`);
  lines.push(`    <priority>${priority.toFixed(1)}</priority>`);
  lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(enHref)}" />`);
  if (hasArabic) {
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${xmlEscape(arHref)}" />`);
  }
  lines.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(enHref)}" />`,
  );
  lines.push('  </url>');

  if (hasArabic) {
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(arHref)}</loc>`);
    if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`);
    lines.push(`    <changefreq>${xmlEscape(changefreq)}</changefreq>`);
    lines.push(`    <priority>${priority.toFixed(1)}</priority>`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(enHref)}" />`);
    lines.push(`    <xhtml:link rel="alternate" hreflang="ar" href="${xmlEscape(arHref)}" />`);
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(enHref)}" />`,
    );
    lines.push('  </url>');
  }
  return lines.join('\n');
}

function build() {
  const today = new Date().toISOString().slice(0, 10);
  const routes = parseRoutes().filter((r) => !r.noindex);
  const articles = readArticles();

  const entries = [];
  for (const r of routes) {
    entries.push(
      urlEntry({
        path: r.path,
        priority: r.priority,
        changefreq: r.changefreq,
        lastmod: today,
        hasArabic: !!r.hasArabic,
      }),
    );
  }
  for (const a of articles) {
    entries.push(
      urlEntry({
        path: `/learn/articles/${a.slug}`,
        priority: 0.8,
        changefreq: 'monthly',
        lastmod: a.publishedAt,
        hasArabic: true,
      }),
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

  writeFileSync(OUT_PATH, xml);
  const urlCount = (xml.match(/<url>/g) || []).length;
  console.log(`Wrote ${OUT_PATH} (${urlCount} URLs across ${routes.length} static routes + ${articles.length} articles)`);
}

build();
