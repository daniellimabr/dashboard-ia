import { useId, type ReactNode } from "react";
import { STEPS, type Data, type Sprint, type Task, type Tone } from "../../data/types";
import { taskStatus } from "../../lib/progress";
import { formatDuration, formatTime } from "../../lib/time";
import { useNow } from "../../lib/useNow";
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

/** Bar meter; `showValue` prints the value inside the bar (use where the number matters). */
export function Meter({
  label,
  pct,
  tone,
  text,
  showValue,
}: {
  label: string;
  pct?: number; // missing = no data
  tone?: Tone;
  text?: string;
  showValue?: boolean;
}) {
  const v = pct ?? 0;
  const value = text ?? (pct === undefined ? "sem dado" : `${v}%`);
  return (
    <div
      className={s.meter}
      data-value={showValue || undefined}
      role="meter"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={value}
    >
      <i data-tone={tone ?? toneOf(v)} style={{ width: `${Math.min(100, v)}%` }} />
      {showValue && <span aria-hidden="true">{value}</span>}
    </div>
  );
}

/** Visible tag for illustrative values the data does not have yet. */
export const Ex = () => <span className={s.ex}>exemplo</span>;

/** Hover/focus tooltip; the parent must have `className={s.tipHost}`. */
export const Tip = ({ children }: { children: ReactNode }) => (
  <span role="tooltip" className={s.tip}>
    {children}
  </span>
);

/** Wave color slot (0–3) as a data attribute; CSS maps it to --wc. */
export const waveSlot = (wave?: number) => (wave ? String((wave - 1) % 4) : undefined);

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

/** Labeled step track (Teste, Código, Lint, Revisão, Commit): done = filled, current = task tone. */
export function Steps({ t }: { t: Task }) {
  const n = t.done ? STEPS.length : (t.steps ?? 0);
  const tone = taskTone(t);
  return (
    <ol className={s.steps} aria-label={`Passos: ${n} de ${STEPS.length}`}>
      {STEPS.map((step, i) => (
        <li
          key={step}
          data-on={i < n || undefined}
          data-tone={i === n && t.startedAt ? tone : undefined}
        >
          {step}
        </li>
      ))}
    </ol>
  );
}

const MIN = 60_000;

export interface Wait {
  kind: "idle" | "reply" | "limit";
  start: number; // ms
  end: number;
}

/** Stretches of at least 1 min in [from, to] with no task running. */
export function idleGaps(tasks: Task[], from: number, to: number): Wait[] {
  const spans = tasks
    .flatMap((t): [number, number][] =>
      t.startedAt ? [[Date.parse(t.startedAt), t.endedAt ? Date.parse(t.endedAt) : to]] : [],
    )
    .sort((a, b) => a[0] - b[0]);
  const out: Wait[] = [];
  let cur = from;
  for (const [a, b] of spans) {
    if (a - cur >= MIN) out.push({ kind: "idle", start: cur, end: a });
    cur = Math.max(cur, b);
  }
  if (to - cur >= MIN) out.push({ kind: "idle", start: cur, end: to });
  return out;
}

const WAIT = {
  idle: "Ocioso",
  reply: "Aguardando resposta",
  limit: "Aguardando limite",
} as const;

/** Real vs planned per task, idle bands and example waits, on a clock axis. */
export function Gantt({
  tasks,
  start,
  now: nowProp,
  waits = [],
  example = [],
}: {
  tasks: Task[];
  start?: string; // sprint start: origin of the plan; missing = now
  now?: number;
  waits?: Wait[]; // real (derived) idle stretches
  example?: Wait[]; // illustrative waits, tagged "exemplo"
}) {
  const tick = useNow();
  const now = nowProp ?? tick;
  const t0 = start ? Date.parse(start) : now;
  const rows = tasks.flatMap((t) => {
    const plan: [number, number] | undefined = t.plan && [
      t0 + t.plan.start * MIN,
      t0 + (t.plan.start + t.plan.duration) * MIN,
    ];
    const a = t.startedAt ? Date.parse(t.startedAt) : NaN;
    const run: [number, number] | undefined = Number.isFinite(a)
      ? [a, t.endedAt ? Date.parse(t.endedAt) : now]
      : undefined;
    return plan || run ? [{ t, plan, run }] : [];
  });
  if (!rows.length)
    return <Empty title="Sem plano de horários">A sprint não tem previsão por tarefa.</Empty>;
  const pts = rows.flatMap((r) => [...(r.plan ?? []), ...(r.run ?? [])]);
  const min = Math.min(...pts);
  const max = Math.max(min + MIN, ...pts);
  const x = (ms: number) => ((Math.min(max, Math.max(min, ms)) - min) / (max - min)) * 100;
  const span = (a: number, b: number) => ({ left: `${x(a)}%`, width: `${x(b) - x(a)}%` });
  const hhmm = (ms: number) => formatTime(new Date(ms).toISOString());
  const step = [15, 30, 60, 120, 240, 480].find((m) => (max - min) / (m * MIN) <= 5) ?? 1440;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / (step * MIN)) * step * MIN; t <= max; t += step * MIN) ticks.push(t);
  const kinds = new Set([...waits, ...example].map((w) => w.kind));
  return (
    <div className={s.gantt}>
      <div className={s.gGrid} role="img" aria-label="Plano das tarefas no tempo">
        <div className={s.gLabels}>
          {example.length > 0 && <span>Esperas</span>}
          {rows.map(({ t }) => (
            <span key={t.id}>{t.id}</span>
          ))}
        </div>
        <div className={s.gPlot}>
          {waits.map((w) => (
            <i key={w.start} className={s.gBand} style={span(w.start, w.end)} />
          ))}
          {example.length > 0 && (
            <div className={s.gRow}>
              {example.map((w) => (
                <i key={w.start} data-k={w.kind} className={s.tipHost} style={span(w.start, w.end)}>
                  <Tip>
                    {WAIT[w.kind]} (exemplo) · {hhmm(w.start)}–{hhmm(w.end)}
                  </Tip>
                </i>
              ))}
            </div>
          )}
          {rows.map(({ t, plan, run }) => (
            <div key={t.id} className={s.gRow}>
              {plan && (
                <b className={s.tipHost} style={span(plan[0], plan[1])}>
                  <Tip>
                    {t.id} previsto · {hhmm(plan[0])}–{hhmm(plan[1])}
                  </Tip>
                </b>
              )}
              {run && (
                <i data-tone={taskTone(t)} className={s.tipHost} style={span(run[0], run[1])}>
                  <Tip>
                    {t.id} executado · {hhmm(run[0])}–{t.endedAt ? hhmm(run[1]) : "agora"} ·{" "}
                    {formatDuration(run[1] - run[0])}
                  </Tip>
                </i>
              )}
            </div>
          ))}
          {now > min && now < max && <i className={s.gNow} style={{ left: `${x(now)}%` }} />}
        </div>
        <div className={s.gAxis}>
          {ticks.map((t) => (
            <span key={t} style={{ left: `${x(t)}%` }}>
              {hhmm(t)}
            </span>
          ))}
        </div>
      </div>
      <ul className={s.gKey} aria-label="Legenda do plano">
        <li data-k="run">Executado</li>
        <li data-k="plan">Previsto</li>
        {(["idle", "reply", "limit"] as const)
          .filter((k) => kinds.has(k))
          .map((k) => (
            <li key={k} data-k={k}>
              <span>{WAIT[k]}</span>
              {example.some((w) => w.kind === k) && <Ex />}
            </li>
          ))}
        {now > min && now < max && <li data-k="now">Agora</li>}
      </ul>
    </div>
  );
}
