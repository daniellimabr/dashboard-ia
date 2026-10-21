import DOMPurify from "dompurify";
import { marked, type Tokens } from "marked";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** `link` rewrites hrefs: a string replaces it, null turns the link into a "não encontrado" note, undefined keeps it. */
export function Markdown({
  source,
  link,
}: {
  source: string;
  link?: (href: string) => string | null | undefined;
}) {
  const html = marked.parse(source, {
    async: false,
    walkTokens: (t) => {
      if (t.type !== "link" || !link) return;
      const tok = t as Tokens.Link;
      const to = link(tok.href);
      if (to === null)
        Object.assign(t, {
          type: "html",
          block: false,
          text: `<span class="muted">${escapeHtml(tok.text)} (não encontrado)</span>`,
        });
      else if (to !== undefined) tok.href = to;
    },
  });
  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
  );
}
