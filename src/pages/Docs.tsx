import { Link, useParams } from "react-router";
import { Markdown } from "../components/Markdown";
import { data } from "../data/mock";
import type { Doc } from "../data/types";
import { useProject } from "../lib/useProject";

const groups: [Doc["kind"], string][] = [
  ["sprint-plan", "Sprint plans"],
  ["release-report", "Release Reports"],
  ["adr", "ADRs"],
  ["prd", "PRDs"],
  ["handoff", "Handoffs"],
];

export function Docs() {
  const project = useProject();
  const { docId } = useParams();
  const base = `/p/${project.id}/docs`;
  const docs = data.docs.filter((d) => d.projectId === project.id);

  if (docId) {
    const doc = docs.find((d) => d.id === docId);
    return (
      <>
        <Link to={base}>← Voltar aos documentos</Link>
        {doc ? (
          <article className="card">
            <Markdown source={doc.markdown} />
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
                <Link to={`${base}/${d.id}`}>{d.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )
    );
  });
}
