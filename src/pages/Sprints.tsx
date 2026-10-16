import { Link, useParams } from "react-router";
import { data } from "../data/mock";
import type { Sprint } from "../data/types";
import { TaskList } from "../components/TaskList";
import { durationMs, formatDate, formatDuration } from "../lib/time";
import { useProject } from "../lib/useProject";

const STATUS = {
  planned: ["planejada", ""],
  active: ["ativa", "badge-live"],
  closed: ["fechada", "badge-ok"],
} as const;

function Meta({ sprint }: { sprint: Sprint }) {
  const [label, cls] = STATUS[sprint.status];
  const done = sprint.tasks.filter((t) => t.done).length;
  const { startedAt, closedAt } = sprint;
  return (
    <p className="muted">
      <span className={`badge ${cls}`}>{label}</span>{" "}
      <span>{`${done}/${sprint.tasks.length} tarefas`}</span>
      {" · "}
      {startedAt
        ? `${formatDate(startedAt)} – ${closedAt ? formatDate(closedAt) : "hoje"} · ${formatDuration(durationMs(startedAt, closedAt))}`
        : "não iniciada"}
    </p>
  );
}

export function Sprints() {
  const project = useProject();
  const { sprintId } = useParams();
  const sprints = data.sprints.filter((s) => s.projectId === project.id);

  if (sprintId) {
    const sprint = sprints.find((s) => s.id === sprintId);
    if (!sprint) return <p className="muted">Sprint {sprintId} não encontrada.</p>;
    return (
      <section>
        <h2>
          {sprint.id} — {sprint.title}
        </h2>
        <Meta sprint={sprint} />
        <TaskList tasks={sprint.tasks} />
      </section>
    );
  }

  if (!sprints.length) return <p className="muted">Nenhuma sprint ainda.</p>;
  return (
    <div className="grid">
      {sprints.map((s) => (
        <article key={s.id} className="card">
          <Link to={s.id}>
            <strong>{s.id}</strong> <span>{s.title}</span>
          </Link>
          <Meta sprint={s} />
        </article>
      ))}
    </div>
  );
}
