import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { getArticle } from '@/content/articles';
import { formatDate } from '@/lib/utils';

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticle(slug) : undefined;

  if (!article) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-serif text-3xl">Article not found</h1>
        <Link to="/learn/articles" className="btn-ghost mt-6">
          Back to articles
        </Link>
      </Container>
    );
  }

  const { frontmatter, Component } = article;

  return (
    <>
      <SeoHead
        title={frontmatter.title}
        description={frontmatter.excerpt}
        type="article"
        canonical={`https://thestraightpath.app/learn/articles/${frontmatter.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: frontmatter.title,
          description: frontmatter.excerpt,
          datePublished: frontmatter.publishedAt,
          author: { '@type': 'Organization', name: frontmatter.author },
          publisher: {
            '@type': 'Organization',
            name: 'The Straight Path',
            logo: {
              '@type': 'ImageObject',
              url: 'https://thestraightpath.app/logo.png',
            },
          },
        }}
      />
      <article className="py-16">
        <Container>
          <Link
            to="/learn/articles"
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-accent-400"
          >
            <ArrowLeft size={14} /> All articles
          </Link>
          <header className="mt-8 border-b border-primary-500/10 pb-8 dark:border-primary-700/40">
            <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
              {formatDate(frontmatter.publishedAt)} · {frontmatter.author}
            </p>
            <h1 className="mt-3 text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
              {frontmatter.title}
            </h1>
            <p className="text-pretty mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
              {frontmatter.excerpt}
            </p>
          </header>
          <div className="prose prose-lg mx-auto mt-12 dark:prose-invert">
            <Component />
          </div>
        </Container>
      </article>
    </>
  );
}
