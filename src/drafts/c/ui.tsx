import { useId, type ReactNode } from "react";
import { STEPS, type Data, type Sprint, type Task, type Tone } from "../../data/types";
import { taskStatus } from "../../lib/progress";
import s from "./c.module.css";

/** Active sprint, else planned, else the latest closed one. */
export function mainSprint(data: Data, projectId: string): Sprint | undefined {
  const mine = data.sprints.filter((x) => x.projectId === projectId);
  return (
    mine.find((x) => x.status === "active") ??
    mine.find((x) => x.status === "planned") ??
    mine.filter((x) => x.status === "closed").at(-1)
  );
}

export const toneOf = (pct: number): Tone | undefined =>
  pct >= 80 ? "bad" : pct >= 60 ? "warn" : undefined;

const TASK_TONE = { done: "ok", failed: "bad", running: "run", todo: undefined } as const;
export const taskTone = (t: Task) => TASK_TONE[taskStatus(t)];

export function Pill({
  tone,
  live,
  children,
}: {
  tone?: Tone;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={s.pill} data-tone={tone} data-live={live || undefined}>
      {children}
    </span>
  );
}

export function Meter({
  label,
  pct,
  tone,
  text,
}: {
  label: string;
  pct?: number; // missing = no data
  tone?: Tone;
  text?: string;
}) {
  const v = pct ?? 0;
  return (
    <div
      className={s.meter}
      role="meter"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={text ?? (pct === undefined ? "sem dado" : `${v}%`)}
    >
      <i data-tone={tone ?? toneOf(v)} style={{ width: `${Math.min(100, v)}%` }} />
    </div>
  );
}

export function Panel({
  title,
  aside,
  wide,
  label,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
  label?: string; // accessible name when the panel is a landmark
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      className={s.panel}
      data-wide={wide || undefined}
      aria-labelledby={label ? undefined : id}
      aria-label={label}
    >
      <header className={s.panelHead}>
        <h2 id={id}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Accordion({
  summary,
  open,
  children,
}: {
  summary: ReactNode;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={s.acc} open={open}>
      <summary>{summary}</summary>
      <div className={s.accBody}>{children}</div>
    </details>
  );
}

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {items.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={v === value}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      <strong>{title}</strong>
      {children && <span>{children}</span>}
    </div>
  );
}

/** Step track: one segment per step; done = filled, current = tone of the task. */
export function Steps({ t }: { t: Task }) {
  const n = t.done ? STEPS.length : (t.steps ?? 0);
  const tone = taskTone(t);
  return (
    <span className={s.steps} title={t.done ? "feita" : (STEPS[n] ?? "")}>
      {STEPS.map((step, i) => (
        <i
          key={step}
          data-on={i < n || undefined}
          data-tone={i === n && t.startedAt ? tone : undefined}
        />
      ))}
    </span>
  );
}

/** Plan gantt: position = planned start, width = planned duration, color = status. */
export function Gantt({ tasks }: { tasks: Task[] }) {
  const planned = tasks.filter((t) => t.plan);
  const end = Math.max(1, ...planned.map((t) => (t.plan?.start ?? 0) + (t.plan?.duration ?? 0)));
  if (!planned.length)
    return <Empty title="Sem plano de horários">A sprint não tem previsão por tarefa.</Empty>;
  return (
    <div className={s.gantt} role="img" aria-label="Plano das tarefas no tempo">
      {planned.map((t) => (
        <div key={t.id} className={s.gRow}>
          <span>{t.id}</span>
          <div>
            <i
              data-tone={taskTone(t)}
              style={{
                left: `${((t.plan?.start ?? 0) / end) * 100}%`,
                width: `${((t.plan?.duration ?? 0) / end) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
      <div className={s.gAxis}>
        <span>0</span>
        <span>{end} min</span>
      </div>
    </div>
  );
}
