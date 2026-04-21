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
    topic?: string;
    series?: string;
  };
  const Component: ComponentType;
  export default Component;
}

declare module '*.mdx?raw' {
  const raw: string;
  export default raw;
}
