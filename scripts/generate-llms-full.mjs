#!/usr/bin/env node
// Generates /public/llms-full.txt by concatenating all published MDX articles.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'apps', 'web', 'src', 'content', 'articles');
const OUT_PATH = join(__dirname, '..', 'apps', 'web', 'public', 'llms-full.txt');

const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'));
const parts = ['# The Straight Path — full article corpus', ''];

for (const file of files) {
  const raw = readFileSync(join(ARTICLES_DIR, file), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) continue;
  const fm = Object.fromEntries(
    match[1]
      .split('\n')
      .filter((l) => l.includes(':'))
      .map((l) => {
        const i = l.indexOf(':');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );
  if (fm.draft === 'true') continue;
  parts.push(`## ${fm.title}`);
  parts.push(`Source: https://thestraightpath.app/learn/articles/${fm.slug}`);
  parts.push('');
  parts.push(match[2].trim());
  parts.push('\n---\n');
}

writeFileSync(OUT_PATH, parts.join('\n'));
console.log(`Wrote ${OUT_PATH}`);
