import type { CSSProperties } from "react";
import type { Task } from "../data/types";
import { ganttLayout, taskPct, taskStatus } from "../lib/progress";
import s from "./Gantt.module.css";

export interface GanttProps {
  tasks: Task[]; // sprint tasks with `plan`
  now?: number; // minutes since sprint start; omit when the sprint isn't running
}

const COLOR = { done: "--ok", running: "--run", failed: "--bad", todo: "--muted" };
const H = 18;

export function Gantt({ tasks, now }: GanttProps) {
  const { span, rows } = ganttLayout(tasks);
  const y = (id: string) => rows.findIndex((r) => r.id === id) * H + H / 2;
  const links = rows.flatMap((r) =>
    r.deps.flatMap((d) => {
      const dep = rows.find((x) => x.id === d);
      if (!dep) return [];
      const ex = dep.left + dep.width;
      return [`M${ex} ${y(d)} L${ex} ${y(r.id)} L${r.left} ${y(r.id)}`];
    }),
  );
  return (
    <>
      <div className={s.gantt} data-testid="gantt">
        <div className={s.labels}>
          {tasks.map((t) => (
            <div key={t.id}>
              <b>{t.id}</b>
              <span className="num">{taskPct(t)}%</span>
            </div>
          ))}
        </div>
        <div className={s.track}>
          <svg viewBox={`0 0 100 ${rows.length * H}`} preserveAspectRatio="none" aria-hidden="true">
            {links.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="var(--muted)"
                strokeWidth="1"
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          {tasks.map((t, i) => {
            const st = taskStatus(t);
            const pct = taskPct(t);
            const bg =
              st === "todo"
                ? "transparent"
                : `color-mix(in srgb, var(${COLOR[st]}) ${30 + Math.round(pct * 0.7)}%, var(--line))`;
            return (
              <div key={t.id} className={s.row}>
                <span
                  className={s.bar}
                  data-status={st}
                  style={{ left: `${rows[i]?.left}%`, width: `${rows[i]?.width}%`, background: bg }}
                  title={`${t.id} · ${pct}%`}
                />
              </div>
            );
          })}
          {now != null && (
            <div
              className={s.now}
              data-now
              style={{ left: `${Math.min(100, (now / span) * 100)}%` }}
            />
          )}
        </div>
      </div>
      <div className={s.key}>
        <span style={{ "--c": "var(--ok)" } as CSSProperties}>feita</span>
        <span style={{ "--c": "var(--run)" } as CSSProperties}>rodando</span>
        <span style={{ "--c": "var(--bad)" } as CSSProperties}>reprovada</span>
        <span style={{ "--c": "var(--line)" } as CSSProperties}>a fazer (tracejada)</span>
        <span>cor mais forte = mais perto de 100%</span>
      </div>
    </>
  );
}
