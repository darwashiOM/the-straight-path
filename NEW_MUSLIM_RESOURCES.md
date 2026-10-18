# New Muslim Resources

`/new-muslim-resources` welcomes new Muslims with a short note that ends with
a link to the contact form, then lists trusted links in four groups (links and
documents, videos, iOS apps, Android apps). The page never names the support
services (mentor, Quran, hijab), since those are switched on and off in Admin
and come and go.

All visible text on the page came from the site owner; see CLAUDE.md before
adding any copy. The owner approved two additions of Claude's: the Arabic
greeting line above the transliteration, and the group headings as worded in
the links file. The page has no search description of its own.

## Editing

- **Links:** `apps/web/src/lib/new-muslim-resources.ts`. Groups and links
  render in file order (it mirrors the team's Linktree list). Each link has a
  title, the URL, the path of its thumbnail, and a fallback icon key. Rows
  show the thumbnail and title only; the owner removed the notes that used to
  sit under each title.
- **Thumbnails:** `apps/web/public/new-muslim-resources/*.webp`, 160 × 160,
  shown in the round badge on a white background. They are the site's or
  app's own icon (App Store / Google Play artwork, the site favicon), the
  YouTube thumbnail cropped square, or the PDF's cover. For a new link, save
  a square WebP there and point the link's `image` at it.
- **Welcome note and other copy:** the `newMuslimPage` block in
  `apps/web/src/locales/en.json`.
- **Page title:** Admin → Site Settings → _New Muslim Resources header_
  (`newMuslimHeader`), like the other page headers.

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
