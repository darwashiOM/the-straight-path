# The Straight Path

A clear, pastoral introduction to Islam — built as a modern, production-ready React application.

## Mission

Provide a calm, thoughtful, accessible hub for people exploring Islam — organized around learning, scripture, questions, and resources. Pastoral in tone, non-sectarian, reader-first.

## Tech Stack

- **Frontend:** React 18 · Vite · TypeScript · Tailwind CSS
- **Routing:** React Router 6
- **Content:** MDX (source-of-truth in repo) with Firestore mirror for dynamic content
- **i18n:** react-i18next (English + Arabic RTL)
- **Backend:** Firebase Hosting · Firestore · Auth · Storage · Cloud Functions (v2)
- **Quality:** ESLint · Prettier · Vitest · Playwright · Lighthouse CI

## Getting Started

```bash
# install deps
pnpm install

# start dev server
pnpm dev

# start firebase emulators
pnpm emulators

# build for production
pnpm build

# preview production build
pnpm preview
```

## Repository Layout

```
the-straight-path/
├── apps/web/                React application
├── functions/               Firebase Cloud Functions
├── firebase.json            Firebase config
├── firestore.rules          Firestore security rules
├── storage.rules            Storage security rules
├── .github/workflows/       CI/CD pipelines
└── scripts/                 One-off maintenance scripts
```

## Contributing Content

See [CONTRIBUTING.md](./CONTRIBUTING.md) for editorial guidelines and the content workflow.

## License

[MIT](./LICENSE)
