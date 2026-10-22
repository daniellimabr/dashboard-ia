import { Link, useParams } from "react-router";
import type { Doc, Sprint } from "../data/types";
import { ProgressRow } from "../components/ProgressRow";
import { TaskList } from "../components/TaskList";
import { durationMs, formatDate, formatDuration } from "../lib/time";
import { useProject } from "../lib/useProject";
import { useData } from "../lib/useData";

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
  const { data } = useData();
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
  // Doc ids are "SNN-plan" (mock) or "<project>:docs/sprints/SNN-plan.md" (repo): match on the file name.
  const docOf = (s: Sprint, kind: Doc["kind"]) =>
    data.docs.find(
      (d) =>
        d.projectId === project.id &&
        d.kind === kind &&
        d.id.split("/").pop()?.startsWith(`${s.id}-`),
    );
  return (
    <section>
      {sprints.reverse().map((s) => {
        const [label, cls] = STATUS[s.status];
        const done = s.tasks.filter((t) => t.done).length;
        const link = (kind: Doc["kind"], text: string) => {
          const d = docOf(s, kind);
          return d ? (
            <Link to={`/p/${project.id}/docs/${encodeURIComponent(d.id)}`}>{text}</Link>
          ) : (
            <span className="muted">{text}: ainda não existe</span>
          );
        };
        return (
          <ProgressRow
            key={s.id}
            title={
              <>
                <strong>{s.id}</strong> {s.title}
              </>
            }
            sub={s.goal}
            right={
              s.startedAt
                ? `${formatDate(s.startedAt)} – ${s.closedAt ? formatDate(s.closedAt) : "hoje"}`
                : "não iniciada"
            }
            pct={s.tasks.length ? Math.round((done / s.tasks.length) * 100) : 0}
            chips={
              <>
                <span className={`badge ${cls}`}>{label}</span>{" "}
                <span className="muted">{`${done}/${s.tasks.length} tarefas`}</span>
              </>
            }
            defaultOpen={s.status === "active"}
          >
            <p>
              {link("sprint-plan", "Sprint plan")} · {link("release-report", "Release Report")}
            </p>
            <TaskList tasks={s.tasks} />
          </ProgressRow>
        );
      })}
    </section>
  );
}
