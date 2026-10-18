import type { CSSProperties } from "react";
import type { Task } from "../data/types";
import { taskPct, taskStatus } from "../lib/progress";
import { formatTime } from "../lib/time";
import s from "./Gantt.module.css";

export interface GanttProps {
  tasks: Task[]; // sprint tasks with `plan`
  now: number; // ms
  live?: boolean; // shows the "agora" line
}

const COLOR = { done: "--ok", running: "--run", failed: "--bad", todo: "--muted" };
const H = 18;
const MIN = 60_000;

/** Real start/end in ms; unstarted tasks are forecast after their deps (or now). */
function schedule(tasks: Task[], now: number) {
  const out = new Map<string, { start: number; end: number }>();
  const get = (t: Task): { start: number; end: number } => {
    const hit = out.get(t.id);
    if (hit) return hit;
    let r;
    if (t.startedAt) {
      r = { start: Date.parse(t.startedAt), end: t.endedAt ? Date.parse(t.endedAt) : now };
    } else {
      out.set(t.id, { start: now, end: now }); // guards against dependency cycles
      const deps = (t.plan?.deps ?? []).flatMap((d) => {
        const dt = tasks.find((x) => x.id === d);
        return dt ? [get(dt).end] : [];
      });
      const start = Math.max(now, ...deps);
      r = { start, end: start + (t.plan?.duration ?? 0) * MIN };
    }
    out.set(t.id, r);
    return r;
  };
  return tasks.map((t) => ({ t, ...get(t) }));
}

export function Gantt({ tasks, now, live }: GanttProps) {
  const rows = schedule(tasks, now);
  const min = Math.min(now, ...rows.map((r) => r.start));
  const max = Math.max(min + MIN, ...rows.map((r) => r.end));
  const x = (ms: number) => ((ms - min) / (max - min)) * 100;
  // round step giving at most ~6 labels
  const step = [15, 30, 60, 120, 240, 480].find((m) => (max - min) / (m * MIN) <= 5) ?? 1440;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / (step * MIN)) * step * MIN; t <= max; t += step * MIN) ticks.push(t);

  const y = (i: number) => i * H + H / 2;
  const links = rows.flatMap(({ t, start }, i) =>
    (t.plan?.deps ?? []).flatMap((d) => {
      const j = rows.findIndex((r) => r.t.id === d);
      const dep = rows[j];
      if (!dep) return [];
      const ex = x(dep.end);
      return [`M${ex} ${y(j)} L${ex} ${y(i)} L${x(start)} ${y(i)}`];
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
          <svg
            viewBox={`0 0 100 ${tasks.length * H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
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
          {rows.map(({ t, start, end }) => {
            const st = taskStatus(t);
            const pct = taskPct(t);
            const forecast = !t.startedAt;
            const bg = forecast
              ? "transparent"
              : `color-mix(in srgb, var(${COLOR[st]}) ${30 + Math.round(pct * 0.7)}%, var(--line))`;
            return (
              <div key={t.id} className={s.row}>
                <span
                  className={s.bar}
                  data-status={forecast ? "todo" : st}
                  style={{
                    left: `${x(start)}%`,
                    width: `${x(end) - x(start)}%`,
                    background: bg,
                  }}
                  title={
                    forecast
                      ? `${t.id} · previsão ${t.plan?.duration ?? 0} min`
                      : `${t.id} · ${pct}%`
                  }
                />
              </div>
            );
          })}
          {live && <div className={s.now} data-now style={{ left: `${x(now)}%` }} />}
        </div>
        <div className={s.axis}>
          {ticks.map((t) => (
            <span key={t} data-testid="tick" style={{ left: `${x(t)}%` }}>
              {formatTime(new Date(t).toISOString())}
            </span>
          ))}
        </div>
      </div>
      <div className={s.key}>
        <span style={{ "--c": "var(--ok)" } as CSSProperties}>feita</span>
        <span style={{ "--c": "var(--run)" } as CSSProperties}>rodando</span>
        <span style={{ "--c": "var(--bad)" } as CSSProperties}>reprovada</span>
        <span style={{ "--c": "var(--line)" } as CSSProperties}>tracejado = previsão</span>
        <span>cor mais forte = mais perto de 100%</span>
      </div>
    </>
  );
}
