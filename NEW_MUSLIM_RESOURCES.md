# New Muslim Resources

`/new-muslim-resources` welcomes new Muslims with a short note, lists trusted
links under **Links for Resources**, and points to the contact form for
requesting a mentor, a Qur'an, or other support.

## Editing

- **Links:** `apps/web/src/lib/new-muslim-resources.ts`. Groups and links
  render in file order (it mirrors the team's Linktree list). Each link has a
  title, a small grey note (site, platform, or file type), the URL, and an
  icon key.
- **Welcome note and other copy:** the `newMuslimPage` block in
  `apps/web/src/locales/en.json`.
- **Page title and subtitle:** Admin → Site Settings → _New Muslim Resources
  header_ (`newMuslimHeader`), like the other page headers.

## Going live

The navbar and footer are read from Firestore, so after deploying add the page
in Admin → Site Settings:

- **Navigation items** → _Add item_: label `New Muslim Resources`, path
  `/new-muslim-resources`.
- **Footer navigation** → Community column → _Add link_, same label and path.

## Contact deep link

`/contact?support=1` opens the "I'm a new Muslim and would like support"
section of the contact form and scrolls to it, as long as at least one support
service is switched on in Admin → Site Settings → Contact. Both links on the
page use it.
