import { Link, useParams } from "react-router";
import { Accordion, Empty, Meter, Pill, TaskTable } from "../components/ui";
import s from "../components/ui.module.css";
import type { Doc } from "../data/types";
import { formatUsd } from "../lib/format";
import { sprintPct } from "../lib/progress";
import { formatDate } from "../lib/time";
import { useData } from "../lib/useData";
import { useProject } from "../lib/useProject";

const STATUS = {
  active: ["ativa", "run"],
  planned: ["planejada", undefined],
  closed: ["fechada", "ok"],
} as const;

export function Sprints() {
  const { data } = useData();
  const p = useProject();
  const { sprintId } = useParams();
  const sprints = data.sprints
    .filter((x) => x.projectId === p.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  // Doc ids are "SNN-plan" (mock) or "<project>:docs/sprints/SNN-plan.md" (repo): match on the file name.
  const doc = (id: string, kind: Doc["kind"], name: string) => {
    const d = data.docs.find(
      (d) => d.projectId === p.id && d.kind === kind && d.id.split("/").pop()?.startsWith(`${id}-`),
    );
    return d ? (
      <Link to={`/p/${p.id}/docs/${encodeURIComponent(d.id)}`}>{name}</Link>
    ) : (
      `${name}: ainda não existe`
    );
  };
  return (
    <>
      <p className={s.muted}>{sprints.length} sprints, a mais recente primeiro.</p>
      <div className={s.stack}>
        {sprints.length === 0 && (
          <Empty title="Nenhuma sprint ainda">
            O primeiro sprint plan aparece aqui depois de aprovado.
          </Empty>
        )}
        {sprints.map((x) => {
          const [label, tone] = STATUS[x.status];
          const done = x.tasks.filter((t) => t.done).length;
          return (
            <Accordion
              key={x.id}
              open={sprintId ? x.id === sprintId : x.status === "active"}
              summary={
                <span className={s.accSum}>
                  <b>{x.id}</b>
                  <span>{x.title}</span>
                  <Pill tone={tone}>{label}</Pill>
                  <span className={s.muted}>
                    {done}/{x.tasks.length} ·{" "}
                    {x.startedAt
                      ? `${formatDate(x.startedAt)} – ${x.closedAt ? formatDate(x.closedAt) : "hoje"}`
                      : "não iniciada"}
                  </span>
                  <Meter
                    label={`Progresso de ${x.id}`}
                    pct={sprintPct(x.tasks)}
                    tone={tone ?? "run"}
                  />
                </span>
              }
            >
              {x.goal && <p>{x.goal}</p>}
              <p className={s.muted}>
                {doc(x.id, "sprint-plan", "Sprint plan")} ·{" "}
                {doc(x.id, "release-report", "Release Report")} · gasto {formatUsd(x.usd ?? 0)}
              </p>
              <TaskTable tasks={x.tasks} />
            </Accordion>
          );
        })}
      </div>
    </>
  );
}
