import { Link } from "react-router";
import { tabs } from "../components/Layout";
import { activeSprint } from "../lib/select";
import { useData } from "../lib/useData";

export function Projects() {
  const { data } = useData();
  return (
    <>
      <h1>Projetos</h1>
      <div className="project-cards">
        {data.projects.map((p) => {
          const sprint =
            activeSprint(data, p.id) ??
            data.sprints.find((s) => s.projectId === p.id && s.status === "planned");
          return (
            <article key={p.id} className="card">
              <h2>
                <Link to={`/p/${p.id}`}>{p.name}</Link>
              </h2>
              {p.phase && (
                <span className={`pill p-${p.phase.tone}${p.phase.live ? " live" : ""}`}>
                  {p.phase.label}
                </span>
              )}
              <p className="muted">
                {sprint ? (
                  <>
                    <Link className="mono" to={`/p/${p.id}/sprints/${sprint.id}`}>
                      {sprint.id}
                    </Link>{" "}
                    · {sprint.title}
                  </>
                ) : (
                  "sem sprint ativa"
                )}
              </p>
              <nav className="tabs" aria-label={`Atalhos de ${p.name}`}>
                {tabs.map(([path, label]) => (
                  <Link key={path} to={`/p/${p.id}/${path}`}>
                    {label}
                  </Link>
                ))}
              </nav>
            </article>
          );
        })}
      </div>
    </>
  );
}
