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
Small mechanical edits (typos, punctuation) are fine, but mention them. Do
not "normalise" the owner's spelling of Arabic phrases (see House style).

## Design rule

Be creative with layout and visual design, but if a design is clearly
different from one the owner proposed (a screenshot, a sketch, a described
layout), show it and get a yes first. Mirroring a provided reference is the
default; departures are proposals, not decisions.

## House style

- Write **in shaa Allah** exactly like that, three words with no diacritics,
  in every UI string, email, and document. Never inshā’Allāh, insha'Allah,
  or inshallah.
- Link lists show the thumbnail and the title only. No note, source line,
  or "opens in a new tab" text under a link.
- A page that needs no search description of its own leaves
  `description: ''` in `apps/web/src/lib/routes.ts` and passes none to
  `<SeoHead>`, which then uses the site-wide default.

## Workflow

- Work on a feature branch, push it, and merge to `main` only when the owner
  says the code looks good. Hosting auto-deploys from `main` through GitHub
  Actions.
- Cloud Functions and Firestore/Storage rules are deployed by the owner from
  their own terminal; give them the commands rather than running
  `firebase deploy`.
- Run `pnpm --filter @tsp/web typecheck` and `pnpm build` before pushing;
  CI also runs `pnpm format:check`.
- Navbar, footer, homepage cards, page headers, and the contact form's
  labels are read from Firestore and edited in Admin → Site Settings;
  defaults in `apps/web/src/lib/content-defaults.ts` are only a fallback.
  New pages need their links added in Admin after the deploy, and a copy
  change to a Firestore-held string needs the owner to edit it in Admin too.
