import { Link } from "react-router";
import { Markdown } from "../components/Markdown";
import { Panel, Pill } from "../components/ui";
import u from "../components/ui.module.css";
import { parseRoadmap, sprintDoc } from "../lib/docsParse";
import { useData } from "../lib/useData";
import { useProject } from "../lib/useProject";
import b from "./Backlog.module.css";
import s from "./Roadmap.module.css";

export function Roadmap() {
  const project = useProject();
  const { data } = useData();
  const cols = parseRoadmap(project.roadmap);
  const sprints = data.sprints.filter((x) => x.projectId === project.id);
  const docs = data.docs.filter((d) => d.projectId === project.id);

  if (!cols)
    return (
      <Panel title="Roadmap" wide>
        <div className={b.md}>
          <Markdown source={project.roadmap} />
        </div>
      </Panel>
    );

  const sprintLink = (id: string) => {
    const doc = sprintDoc(id, sprints, docs);
    const title = sprints.find((x) => x.id === id)?.title;
    return doc ? (
      <Link key={id} to={`/p/${project.id}/docs/${encodeURIComponent(doc.id)}`} title={title}>
        {id}
      </Link>
    ) : (
      <span key={id} title={title}>
        {id}
      </span>
    );
  };

  return (
    <Panel title="Roadmap" wide>
      <div className={s.cols}>
        {cols.map((c) => (
          <section key={c.name} className={s.col} aria-label={c.name}>
            <h3 className={u.row}>
              {c.name} <Pill>{c.items.length}</Pill>
            </h3>
            {c.items.length ? (
              <ul className={s.cards}>
                {c.items.map((i) => (
                  <li key={i.text} className={s.card}>
                    {i.sprints.length > 0 && (
                      <div className={u.row}>{i.sprints.map(sprintLink)}</div>
                    )}
                    {i.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={u.muted}>Nada aqui.</p>
            )}
          </section>
        ))}
      </div>
    </Panel>
  );
}
