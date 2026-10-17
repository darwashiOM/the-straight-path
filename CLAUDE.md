# Working on The Straight Path

Guidance for Claude (and anyone else) working in this repo with the site
owner. The code docs live next to this file: README.md, CONTACT_SETUP.md,
MOBILE_BILLBOARDS.md, NEW_MUSLIM_RESOURCES.md, ADMIN_SETUP.md.

## Content rule: never add content without running it by the owner

Do **not** add, invent, or reword visible content without the owner's
explicit approval. This covers every piece of text a visitor can read or a
search engine can index:

- page titles, subtitles, section headings, and labels;
- helper lines, hints, notes, button text, and empty states;
- card or intro copy such as "Every link opens in a new tab" or "Our small
  team is happy to help";
- SEO titles and meta descriptions, alt text, email wording;
- images, icons, and thumbnails that carry meaning.

Use the owner's words as given. If a label is genuinely needed and none was
supplied, propose the exact wording and wait for a yes before it ships.
Small mechanical edits (typos, punctuation, the site's standard
transliterations) are fine, but mention them.

## Design rule

Be creative with layout and visual design, but if a design is clearly
different from one the owner proposed (a screenshot, a sketch, a described
layout), show it and get a yes first. Mirroring a provided reference is the
default; departures are proposals, not decisions.

## Workflow

- Work on a feature branch, push it, and merge to `main` only when the owner
  says the code looks good. Hosting auto-deploys from `main` through GitHub
  Actions.
- Cloud Functions and Firestore/Storage rules are deployed by the owner from
  their own terminal; give them the commands rather than running
  `firebase deploy`.
- Run `pnpm --filter @tsp/web typecheck` and `pnpm build` before pushing;
  CI also runs `pnpm format:check`.
- Navbar, footer, homepage cards, and page headers are read from Firestore
  and edited in Admin → Site Settings; defaults in
  `apps/web/src/lib/content-defaults.ts` are only a fallback. New pages
  need their links added in Admin after the deploy.
