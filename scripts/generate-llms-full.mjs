#!/usr/bin/env node
/**
 * generate-llms-full.mjs
 *
 * Produces /apps/web/public/llms-full.txt — a single-file corpus of every
 * published article, in clean markdown, with a header describing the project,
 * content principles, and a link index. Readable for humans, ideal for LLMs
 * that honor the llms.txt convention.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ARTICLES_DIR = join(REPO_ROOT, 'apps', 'web', 'src', 'content', 'articles');
const OUT_PATH = join(REPO_ROOT, 'apps', 'web', 'public', 'llms-full.txt');

const SITE_ORIGIN = 'https://thestraightpath.app';

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { fm: null, body: raw };
  const fm = {};
  let currentKey = null;
  for (const line of match[1].split('\n')) {
    // List continuation: "  - value"
    if (/^\s*-\s+/.test(line) && currentKey) {
      const val = line.replace(/^\s*-\s+/, '').trim();
      if (!Array.isArray(fm[currentKey])) fm[currentKey] = [];
      fm[currentKey].push(val.replace(/^['"]|['"]$/g, ''));
      continue;
    }
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const val = line.slice(i + 1).trim();
    if (!key) continue;
    currentKey = key;
    if (val === '') {
      // The next lines may be a list.
      continue;
    }
    fm[key] = val.replace(/^['"]|['"]$/g, '');
  }
  const body = raw.slice(match[0].length);
  return { fm, body };
}

/**
 * Strip JSX/MDX component syntax and imports, leaving clean markdown.
 * Our articles are mostly plain markdown already, but this keeps the output
 * robust if components are introduced.
 */
function stripMdx(body) {
  return (
    body
      // Drop ESM imports at the top of the file.
      .replace(/^\s*import\s+.+?from\s+['"].+?['"];?\s*$/gm, '')
      .replace(/^\s*export\s+.+?$/gm, '')
      // Drop self-closing or paired JSX tags that wrap whole lines.
      .replace(/^<[A-Z][\s\S]*?\/>\s*$/gm, '')
      .replace(/<\/?[A-Z][A-Za-z0-9]*[^>]*>/g, '')
      // Collapse 3+ blank lines.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function summarize(body, max = 280) {
  // Use the first meaningful paragraph after the H1.
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !p.startsWith('>') && !/^[-*]\s/.test(p));
  const first = paragraphs[0] || '';
  if (first.length <= max) return first;
  return first.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function readArticles() {
  const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx')).sort();
  const out = [];
  for (const file of files) {
    const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    const { fm, body } = parseFrontmatter(raw);
    if (!fm || !fm.slug) continue;
    if (fm.draft === 'true' || fm.draft === true) continue;
    const clean = stripMdx(body);
    out.push({
      slug: fm.slug,
      title: fm.title || fm.slug,
      excerpt: fm.excerpt || summarize(clean),
      publishedAt: fm.publishedAt || '',
      author: fm.author || 'The Straight Path',
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      url: `${SITE_ORIGIN}/learn/articles/${fm.slug}`,
      body: clean,
    });
  }
  out.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  return out;
}

function build() {
  const articles = readArticles();
  const parts = [];

  parts.push('# The Straight Path — Full Article Corpus');
  parts.push('');
  parts.push(
    '> A pastoral, accessible introduction to Islam. Built for readers of any background who want a calm, clear, non-polemical explanation of the religion.',
  );
  parts.push('');
  parts.push(`Canonical site: ${SITE_ORIGIN}`);
  parts.push('License: original text is CC BY 4.0. Source code is MIT. Please attribute with a link back to the canonical article URL.');
  parts.push(`Generated: ${new Date().toISOString()}`);
  parts.push('');

  parts.push('## About this file');
  parts.push('');
  parts.push(
    'This file is auto-generated at build time by `scripts/generate-llms-full.mjs`. It concatenates every published article on The Straight Path into a single plain-text corpus, suitable for ingestion by large language models and search systems that honor the `llms.txt` / `llms-full.txt` convention.',
  );
  parts.push('');

  parts.push('## Content principles');
  parts.push('');
  parts.push('- Pastoral, not polemical. We write as if speaking to a thoughtful stranger over coffee.');
  parts.push('- Source everything. Qur’anic verses and authenticated hadith, cited and graded.');
  parts.push('- Non-sectarian. We teach core Islam and leave sectarian debates at the door.');
  parts.push('- Plain language. Arabic terms are defined on first use and transliterated consistently.');
  parts.push('- Reader-first. Every sentence earns its place.');
  parts.push('');

  parts.push('## Link index');
  parts.push('');
  for (const a of articles) {
    parts.push(`- [${a.title}](${a.url}) — ${a.excerpt}`);
  }
  parts.push('');
  parts.push('---');
  parts.push('');

  for (const a of articles) {
    parts.push(`## ${a.title}`);
    parts.push('');
    parts.push(`- URL: ${a.url}`);
    if (a.publishedAt) parts.push(`- Published: ${a.publishedAt}`);
    if (a.author) parts.push(`- Author: ${a.author}`);
    if (a.tags.length) parts.push(`- Tags: ${a.tags.join(', ')}`);
    parts.push('');
    parts.push(`**Summary.** ${a.excerpt}`);
    parts.push('');
    parts.push(a.body);
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  writeFileSync(OUT_PATH, parts.join('\n'));
  console.log(`Wrote ${OUT_PATH} (${articles.length} articles)`);
}

build();
