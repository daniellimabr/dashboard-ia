import type { MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Markdown } from "../components/Markdown";
import { Empty } from "../components/ui";
import s from "../components/ui.module.css";
import type { Doc } from "../data/types";
import { useData } from "../lib/useData";
import { useProject } from "../lib/useProject";
import p from "./Docs.module.css";

const DOC_KINDS: [Doc["kind"], string][] = [
  ["sprint-plan", "Sprint plans"],
  ["release-report", "Release reports"],
  ["adr", "ADRs"],
  ["prd", "PRDs"],
  ["handoff", "Handoffs"],
];

export function Docs() {
  const { data } = useData();
  const project = useProject();
  const { docId: id } = useParams();
  const navigate = useNavigate();
  const base = `/p/${project.id}/docs`;
  const docs = data.docs.filter((d) => d.projectId === project.id);
  const docUrl = (id: string) => `${base}/${encodeURIComponent(id)}`;
  const open = docs.find((d) => d.id === id);

  // Relative .md links resolve against the doc's repo path (id = "<project>:docs/<path>"); only docs/ targets open.
  const link = (href: string) => {
    if (!id || /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(href) || !/\.md(#|$)/i.test(href))
      return undefined;
    const rel = id.slice(id.indexOf(":") + 1);
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

  if (!docs.length)
    return <Empty title="Nenhum documento">Sprint plans, ADRs e PRDs aparecem aqui.</Empty>;
  return (
    <div className={p.docs}>
      <nav aria-label="Documentos" className={p.docList}>
        {DOC_KINDS.map(([kind, name]) => {
          const items = docs.filter((d) => d.kind === kind);
          return (
            items.length > 0 && (
              <div key={kind}>
                <span className={s.k}>{name}</span>
                {items.map((d) => (
                  <Link key={d.id} to={docUrl(d.id)} aria-current={d.id === id || undefined}>
                    {d.title}
                  </Link>
                ))}
              </div>
            )
          );
        })}
      </nav>
      <article className={`${s.panel} ${p.md}`} onClick={follow}>
        {open ? (
          <Markdown source={open.markdown} link={link} />
        ) : id ? (
          <Empty title="Documento não encontrado.">Escolha outro na lista ao lado.</Empty>
        ) : (
          <Empty title="Escolha um documento">Ele abre aqui, ao lado da lista.</Empty>
        )}
      </article>
    </div>
  );
}
