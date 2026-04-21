export interface ArticleFrontmatter {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  tags?: string[];
  heroImage?: string;
  draft?: boolean;
}

export interface ArticleModule {
  frontmatter: ArticleFrontmatter;
  Component: React.ComponentType;
}

type MdxImport = {
  frontmatter: ArticleFrontmatter;
  default: React.ComponentType;
};

const modules = import.meta.glob<MdxImport>('./*.mdx', { eager: true });

export const articles: ArticleModule[] = Object.values(modules)
  .map((m) => ({
    frontmatter: m.frontmatter,
    Component: m.default,
  }))
  .sort(
    (a, b) =>
      new Date(b.frontmatter.publishedAt).getTime() -
      new Date(a.frontmatter.publishedAt).getTime(),
  );

export function getArticle(slug: string): ArticleModule | undefined {
  return articles.find((a) => a.frontmatter.slug === slug);
}

export function getPublishedArticles(): ArticleModule[] {
  return articles.filter((a) => !a.frontmatter.draft);
}
