import { formatTokens, formatUsd } from "../lib/format";
import { Link } from "react-router";
import { data } from "../data/mock";
import { activeSprint, runningAgents } from "../lib/select";
import { dailySeries } from "../lib/usage";

export function Overview() {
  return (
    <>
      <h1>Visão geral</h1>
      <div className="grid">
        {data.projects.map((p) => {
          const sprint = activeSprint(data, p.id);
          const agents = runningAgents(data, p.id);
          const today = dailySeries(data.usage, p.id).at(-1);
          return (
            <article key={p.id} className="card">
              <h2>
                <Link to={`/p/${p.id}`}>{p.name}</Link>
              </h2>
              {sprint ? (
                <p>
                  <strong>{`${sprint.id} · ${sprint.title}`}</strong>
                  <br />
                  <span className="muted">{`${sprint.tasks.filter((t) => t.done).length}/${sprint.tasks.length} tarefas feitas`}</span>
                </p>
              ) : (
                <p className="muted">sem sprint ativa</p>
              )}
              {agents.length ? (
                <ul>
                  {agents.map((a) => (
                    <li key={a.id}>
                      <span className="badge badge-live">rodando</span> <span>{a.name}</span>
                      {a.task && <span className="muted"> · {a.task}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">nenhum agente rodando</p>
              )}
              {today && (
                <p className="muted">{`${formatUsd(today.usd)} · ${formatTokens(today.tokens)} tokens`}</p>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
