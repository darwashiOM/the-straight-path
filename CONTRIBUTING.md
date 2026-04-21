# Contributing to The Straight Path

Thank you for your interest in contributing. This project is community-driven and depends on thoughtful contributions of content, code, translations, and design.

## Editorial Principles

The Straight Path is pastoral, not polemical. We invite, we do not attack.

1. **Pastoral tone.** Write as if speaking to a thoughtful, curious stranger over coffee.
2. **Source everything.** Cite Qur'anic verses and authenticated hadith with grading.
3. **Non-sectarian.** Teach core Islam. Avoid madhab-specific jurisprudence in foundational content.
4. **Plain language.** Define Arabic terms on first use. Transliterate consistently (Allāh, Qur'ān, Muḥammad).
5. **Accessibility first.** Assume a thoughtful non-Muslim reader who has no prior familiarity with Islam.
6. **Concision.** Short paragraphs. No filler. Every sentence earns its place.

## Content Workflow

1. Open an issue describing the article or change.
2. Fork the repo and create a branch: `content/<slug>`.
3. Add an MDX file under `apps/web/src/content/articles/<slug>.mdx`.
4. Include frontmatter: `title`, `excerpt`, `publishedAt`, `tags`, `heroImage`.
5. Open a PR; a maintainer reviews tone, sourcing, and clarity.

## Code Workflow

1. Open an issue before non-trivial changes.
2. Branch: `feat/<short-name>`, `fix/<short-name>`, or `chore/<short-name>`.
3. Ensure `pnpm lint && pnpm typecheck && pnpm test` pass before opening PR.
4. Keep PRs focused — one concern per PR.

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `content:` new or updated article
- `chore:` maintenance
- `docs:` documentation only
- `refactor:` no behavior change
- `perf:` performance
- `test:` tests only

## Code of Conduct

Be respectful. Assume good faith. Reviews are about the work, not the person.
