import type { MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Markdown } from "../components/Markdown";
import type { Doc } from "../data/types";
import { useProject } from "../lib/useProject";
import { useData } from "../lib/useData";

const groups: [Doc["kind"], string][] = [
  ["sprint-plan", "Sprint plans"],
  ["release-report", "Release Reports"],
  ["adr", "ADRs"],
  ["prd", "PRDs"],
  ["handoff", "Handoffs"],
];

export function Docs() {
  const { data } = useData();
  const project = useProject();
  const { docId } = useParams();
  const navigate = useNavigate();
  const base = `/p/${project.id}/docs`;
  const docs = data.docs.filter((d) => d.projectId === project.id);

  const docUrl = (id: string) => `${base}/${encodeURIComponent(id)}`;

  if (docId) {
    const doc = docs.find((d) => d.id === docId);
    // Relative .md links resolve against the doc's repo path (id = "<project>:docs/<path>"); only docs/ targets open.
    const link = (href: string) => {
      if (/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(href) || !/\.md(#|$)/i.test(href)) return undefined;
      const rel = docId.slice(docId.indexOf(":") + 1);
      let path: string;
      try {
        path = decodeURIComponent(new URL(href, `http://x/${rel}`).pathname);
      } catch {
        return null; // malformed %-escape
      }
      const target = path.startsWith("/docs/") && `${project.id}:${path.slice(1)}`;
      return target && docs.some((d) => d.id === target) ? docUrl(target) : null;
    };
    const follow = (e: MouseEvent<HTMLElement>) => {
      const href = (e.target as Element).closest("a")?.getAttribute("href");
      if (href?.startsWith(`${base}/`)) {
        e.preventDefault();
        void navigate(href);
      }
    };
    return (
      <>
        <Link to={base}>← Voltar aos documentos</Link>
        {doc ? (
          <article className="card" onClick={follow}>
            <Markdown source={doc.markdown} link={link} />
          </article>
        ) : (
          <p className="muted">Documento não encontrado.</p>
        )}
      </>
    );
  }

  if (!docs.length) return <p className="muted">Nenhum documento neste projeto.</p>;

  return groups.map(([kind, label]) => {
    const items = docs.filter((d) => d.kind === kind);
    return (
      items.length > 0 && (
        <section key={kind}>
          <h2>{label}</h2>
          <ul>
            {items.map((d) => (
              <li key={d.id}>
                <Link to={docUrl(d.id)}>{d.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )
    );
  });
}
