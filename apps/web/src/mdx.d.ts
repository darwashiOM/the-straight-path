declare module '*.mdx' {
  import type { ComponentType } from 'react';
  export const frontmatter: {
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: string;
    author: string;
    tags?: string[];
    heroImage?: string;
    draft?: boolean;
  };
  const Component: ComponentType;
  export default Component;
}
