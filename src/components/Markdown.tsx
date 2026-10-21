import DOMPurify from "dompurify";
import { marked } from "marked";

export function Markdown({ source }: { source: string }) {
  return (
    <div
      className="markdown"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(marked.parse(source, { async: false })),
      }}
    />
  );
}
