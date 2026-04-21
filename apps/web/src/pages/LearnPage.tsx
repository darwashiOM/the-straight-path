import { Link } from 'react-router-dom';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { getPublishedArticles } from '@/content/articles';

export default function LearnPage() {
  const articles = getPublishedArticles();
  return (
    <>
      <SeoHead title="Learn About Islam" canonical="https://thestraightpath.app/learn" />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          Learn About Islam
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          A curated set of articles introducing the core ideas, character, and practices of Islam —
          written for readers of any background.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.frontmatter.slug}
              to={`/learn/articles/${a.frontmatter.slug}`}
              className="card group p-6"
            >
              <h2 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                {a.frontmatter.title}
              </h2>
              <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">
                {a.frontmatter.excerpt}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
