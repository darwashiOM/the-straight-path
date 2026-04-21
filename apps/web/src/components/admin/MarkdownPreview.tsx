import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  source: string;
}

/**
 * MarkdownPreview — renders the article body inside a `prose` container so it
 * reads like the real article page. GFM tables / task lists / strikethrough
 * are enabled to match common editor expectations.
 */
export default function MarkdownPreview({ source }: Props) {
  return (
    <article className="prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {source || '*Preview will appear here as you type.*'}
      </ReactMarkdown>
    </article>
  );
}
