# New Muslim Resources

`/new-muslim-resources` welcomes new Muslims with a short note, lists trusted
links under **Links for Resources**, and points to the contact form for
anyone who has questions or needs more help. The page itself never names the
support services (mentor, Qur'an, hijab), since those are switched on and off
in Admin and come and go.

## Editing

- **Links:** `apps/web/src/lib/new-muslim-resources.ts`. Groups and links
  render in file order (it mirrors the team's Linktree list). Each link has a
  title, a small grey note (site, platform, or file type), the URL, the path
  of its thumbnail, and a fallback icon key.
- **Thumbnails:** `apps/web/public/new-muslim-resources/*.webp`, 160 × 160,
  shown in the round badge on a white background. They are the site's or
  app's own icon (App Store / Google Play artwork, the site favicon), the
  YouTube thumbnail cropped square, or the PDF's cover. For a new link, save
  a square WebP there and point the link's `image` at it.
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
