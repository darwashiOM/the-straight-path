# Performance notes

A living checklist for performance work on The Straight Path. Edit freely.

## index.html

- [x] `<link rel="preconnect">` for `fonts.googleapis.com` and
      `fonts.gstatic.com` (crossorigin)
- [x] Fonts loaded with `display=swap`
- [x] `<meta name="theme-color">` set
- [ ] Consider self-hosting fonts (remove 3rd-party handshake entirely)
- [ ] Add `<link rel="preload" as="image">` for the above-the-fold hero
      image once a hero is finalized
- [ ] Add `<link rel="modulepreload">` hints for the main entry chunk if
      Lighthouse flags it

> Note: `index.html` is owned by the PWA agent. This checklist is the
> handoff — do not edit `index.html` here unless you've coordinated with
> that agent.

## Images

- Use the `<Image>` component from `apps/web/src/components/Image.tsx`.
  It wraps `<img>` with `loading="lazy"`, `decoding="async"`, explicit
  width/height (to prevent CLS), and an optional `<picture>` WebP
  fallback.
- For above-the-fold / LCP images, pass `priority` to swap `loading` to
  `"eager"` and set `fetchPriority="high"`.

## JS budget

- Total gzipped JS in `apps/web/dist/assets` must stay under **600 KB**
  (enforced by `.size-limit.json`).
- Route-split with `React.lazy` for large pages (Quran, Article).

## Lighthouse budgets

Enforced in `.lighthouserc.json` on every PR to `main`:

- Performance >= 0.90
- Accessibility >= 0.95
- Best Practices >= 0.95
- SEO >= 0.95
- FCP <= 2000ms
- LCP <= 2500ms
- CLS <= 0.1
- TBT <= 300ms

## Known future work

- [ ] Precompress (`.br`, `.gz`) build output at deploy time.
- [ ] Audit third-party font weights actually used; trim the subset.
- [ ] Once analytics lands, load it with `defer` / after interaction.
