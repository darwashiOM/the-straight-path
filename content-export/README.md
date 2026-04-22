# content-export/

This directory is **auto-generated** by
`scripts/export-firestore-to-repo.mjs`, which is run nightly by the
`.github/workflows/content-export.yml` workflow.

These files are a **snapshot** of the live Firestore CMS. They are
**not** the source of truth — editing them will not update the site.
To change content, edit it through the admin panel at `/admin`.

The snapshot exists so:

1. Content is versioned in git.
2. Diffs on PRs show exactly what editors changed, and when.
3. We have an offline, human-readable backup in the repo.

Layout:

- `articles/<slug>.mdx` — one file per article, frontmatter + English
  body. The Arabic body (if present) lives under the `ar_body`
  frontmatter key so the file is still a single-body MDX document.
- `resources.json`, `faqs.json`, `channels.json`, `series.json`,
  `topics.json`, `site-settings.json`, `pages.json` — one JSON file
  per collection, keyed by document id.

Output is deterministic (sorted keys, stable ordering) so day-to-day
diffs are minimal.
