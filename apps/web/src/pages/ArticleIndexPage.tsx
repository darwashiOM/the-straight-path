import { Link } from 'react-router-dom';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { articles } from '@/content/articles';
import { formatDate } from '@/lib/utils';

export default function ArticleIndexPage() {
  return (
    <>
      <SeoHead title="Articles" canonical="https://thestraightpath.app/learn/articles" />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          Articles
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          Essays on the foundations of Islam — the creed, the Prophet, the Qur'an, and the path.
        </p>
        <ul className="mt-12 divide-y divide-primary-500/10 dark:divide-primary-700/40">
          {articles.map((a) => (
            <li key={a.frontmatter.slug} className="py-6">
              <Link
                to={`/learn/articles/${a.frontmatter.slug}`}
                className="group block"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-2xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                    {a.frontmatter.title}
                    {a.frontmatter.draft ? (
                      <span className="ml-3 rounded bg-accent-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent-700">
                        Draft
                      </span>
                    ) : null}
                  </h2>
                  <span className="shrink-0 text-sm text-ink/50 dark:text-paper/60">
                    {formatDate(a.frontmatter.publishedAt)}
                  </span>
                </div>
                <p className="mt-2 text-ink/70 dark:text-paper/70">{a.frontmatter.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
