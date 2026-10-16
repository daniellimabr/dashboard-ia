import { marked } from "marked";

// shortcut: renders raw HTML from markdown; fine for local mock docs, sanitize when reading real repo files.
export function Markdown({ source }: { source: string }) {
  return (
    <div
      className="markdown"
      dangerouslySetInnerHTML={{ __html: marked.parse(source, { async: false }) }}
    />
  );
}
