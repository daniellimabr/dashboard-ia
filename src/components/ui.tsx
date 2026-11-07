import { useId, type CSSProperties, type ReactNode } from "react";
import { STEPS, type Data, type Sprint, type Task, type Tone } from "../data/types";
import { costLine } from "../lib/pct";
import { agentLabel, taskPct, taskStatus } from "../lib/progress";
import { Kinds } from "./Consumption";
import { useData } from "../lib/useData";
import { durationMs, formatDate, formatDateTime, formatDuration, formatTime } from "../lib/time";
import { useNow } from "../lib/useNow";
import s from "./ui.module.css";

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

export interface Pause {
  kind: "idle" | "reply" | "limit";
  start: number; // ms
  end: number;
}

/** Stretches of at least 1 min in [from, to] with no task running. */
export function idleGaps(tasks: Task[], from: number, to: number): Pause[] {
  const spans = tasks
    .flatMap((t): [number, number][] =>
      t.startedAt ? [[Date.parse(t.startedAt), t.endedAt ? Date.parse(t.endedAt) : to]] : [],
    )
    .sort((a, b) => a[0] - b[0]);
  const out: Pause[] = [];
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

// Legend item: [key, visible short label, tooltip, full accessible name when the label is cut]
type KeyItem = [string, string, string, string?];
const KEY: KeyItem[] = [
  ["ok", "Feita", "Tarefa concluída"],
  ["run", "Rodando", "Tarefa em andamento"],
  ["bad", "Reprovada", "Tarefa reprovada na revisão"],
  ["todo", "A fazer", "Ainda não começou (contorno tracejado)"],
  ["pct", "%", "Cor mais forte = mais perto de 100%", "Cor mais forte = mais perto de 100%"],
];
const PAUSE_KEY: KeyItem[] = [
  ["idle", "Ocioso", "Ocioso: nenhuma tarefa rodando"],
  ["reply", "Resposta", WAIT.reply, WAIT.reply],
  ["limit", "Limite", WAIT.limit, WAIT.limit],
];
const NOW_KEY: KeyItem = ["now", "Agora", "Hora atual"];

/**
 * Mini-gantt: position = sprint plan, color = status,
 * intensity = %, dashed = not started. The axis is the plan, so long pauses never squash
 * the tasks; pauses go in their own lane, clipped to the plan window. Real times: tooltip.
 */
export function Gantt({
  tasks,
  start,
  now: nowProp,
  waits = [],
}: {
  tasks: Task[];
  start?: string; // sprint start: origin of the plan; missing = now
  now?: number;
  waits?: Pause[]; // idle stretches plus the sprint's reply/limit waits
}) {
  const tick = useNow();
  const now = nowProp ?? tick;
  const planned = start ? Date.parse(start) : now;
  const rows0 = tasks.flatMap((t) => (t.plan ? [{ t, p: t.plan }] : []));
  if (!rows0.length)
    return <Empty title="Sem plano de horários">A sprint não tem previsão por tarefa.</Empty>;
  // Real bar for started tasks; planned slot for the rest, pushed past now once it has gone by.
  const rows = rows0.map(({ t, p }) => {
    let a = planned + p.start * MIN;
    let b = a + p.duration * MIN;
    if (t.startedAt) {
      a = Date.parse(t.startedAt);
      b = t.endedAt ? Date.parse(t.endedAt) : now;
    } else if (a < now) {
      a = now;
      b = now + p.duration * MIN;
    }
    return { t, p, a, b };
  });
  const starts = rows.flatMap(({ t, a }) => (t.startedAt ? [a] : []));
  const t0 = starts.length ? Math.min(...starts) : planned;
  const end = Math.max(
    MIN,
    now - t0,
    ...rows0.map(({ p }) => planned + (p.start + p.duration) * MIN - t0),
    ...rows.map(({ b }) => b - t0),
  );
  const x = (ms: number) => (Math.min(end, Math.max(0, ms - t0)) / end) * 100;
  const span = (a: number, b: number) => ({ left: `${x(a)}%`, width: `${x(b) - x(a)}%` });
  // day shown only when the axis crosses midnight
  const multiDay =
    formatDate(new Date(t0).toISOString()) !== formatDate(new Date(t0 + end).toISOString());
  const stamp = multiDay ? formatDateTime : formatTime;
  const hhmm = (ms: number) => stamp(new Date(ms).toISOString());
  const step = [15, 30, 60, 120, 240, 480].find((m) => end / (m * MIN) <= 5) ?? 1440;
  const ticks: number[] = [];
  for (let m = 0; m * MIN <= end; m += step) ticks.push(t0 + m * MIN);
  const pauses = waits.filter((w) => x(w.end) > x(w.start));
  const kinds = new Set(pauses.map((w) => w.kind));
  const live = now > t0 && now <= t0 + end;
  return (
    <div className={s.gantt}>
      <div className={s.gGrid} role="img" aria-label="Plano das tarefas no tempo">
        <div className={s.gLabels}>
          {pauses.length > 0 && <span>Pausas</span>}
          {rows.map(({ t }) => (
            <span key={t.id}>
              <b>{t.id}</b> {taskPct(t)}%
            </span>
          ))}
        </div>
        <div className={s.gPlot}>
          {pauses.length > 0 && (
            <div className={s.gRow}>
              {pauses.map((w) => (
                <i
                  key={w.kind + w.start}
                  data-k={w.kind}
                  className={s.tipHost}
                  style={span(w.start, w.end)}
                >
                  <Tip>
                    {WAIT[w.kind]} · {hhmm(w.start)}–{hhmm(w.end)}
                  </Tip>
                </i>
              ))}
            </div>
          )}
          {rows.map(({ t, p, a, b }) => {
            const pct = taskPct(t);
            const pa = planned + p.start * MIN;
            return (
              <div key={t.id} className={s.gRow}>
                <i
                  className={s.tipHost}
                  data-tone={t.startedAt ? taskTone(t) : undefined}
                  // intensity = progress, as in the main panel's gantt
                  style={
                    { ...span(a, b), "--p": `${30 + Math.round(pct * 0.7)}%` } as CSSProperties
                  }
                >
                  <Tip>
                    {t.id} · previsto {hhmm(pa)}–{hhmm(pa + p.duration * MIN)}
                    {t.startedAt &&
                      ` · executado ${stamp(t.startedAt)}–${t.endedAt ? stamp(t.endedAt) : "agora"} (${formatDuration(durationMs(t.startedAt, t.endedAt, now))})`}
                  </Tip>
                </i>
              </div>
            );
          })}
          {live && <i className={s.gNow} style={{ left: `${x(now)}%` }} />}
        </div>
        <div className={s.gAxis} style={multiDay ? { height: 28 } : undefined}>
          {ticks.map((t) => (
            <span key={t} data-end={x(t) === 100 || undefined} style={{ left: `${x(t)}%` }}>
              {multiDay && (
                <>
                  {formatDate(new Date(t).toISOString())}
                  <br />
                </>
              )}
              {formatTime(new Date(t).toISOString())}
            </span>
          ))}
        </div>
      </div>
      <ul className={s.gKey} aria-label="Legenda do plano">
        {[
          ...KEY,
          ...PAUSE_KEY.filter(([k]) => kinds.has(k as Pause["kind"])),
          ...(live ? [NOW_KEY] : []),
        ].map(([k, short, title, name]) => (
          <li key={k} data-k={k} title={title}>
            {name ? (
              <>
                <span className={s.sr}>{name}</span>
                <span aria-hidden="true">{short}</span>
              </>
            ) : (
              short
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TASK_LABEL = { done: "feita", failed: "reprovada", running: "rodando", todo: "a fazer" };

/** Agent badge for a task: the chat agent that took it (C1, C2…), else the planned kind. */
function useTaskAgent() {
  const { data } = useData();
  const agents = data.chats.flatMap((c) => c.agents.map((a) => ({ a, c })));
  return (t: Task) => {
    const hit = agents.find(({ a, c }) => a.task === t.id && c.tasks.includes(t))?.a;
    if (hit) return { label: agentLabel(hit.kind, hit.name), name: hit.name };
    return t.agent ? { label: agentLabel(t.agent), name: t.agent } : undefined;
  };
}

/** Friendly model name from an id: claude-sonnet-5-5 → Sonnet, gemini-… → Gemini. */
function modelName(id?: string) {
  const w = id?.match(/sonnet|opus|haiku|fable|gemini/i)?.[0];
  return w ? w[0]?.toUpperCase() + w.slice(1).toLowerCase() : id;
}

/** End of a task: real when it ended; else real start (or sprint start + planned start) + planned duration. */
export function taskEnd(t: Task, start?: string): { ms: number; real: boolean } | undefined {
  if (t.endedAt) return { ms: Date.parse(t.endedAt), real: true };
  if (!t.plan) return undefined;
  const from = t.startedAt
    ? Date.parse(t.startedAt)
    : start && Date.parse(start) + t.plan.start * MIN;
  return from ? { ms: from + t.plan.duration * MIN, real: false } : undefined;
}

/** Elapsed over planned minutes as a bar; past the plan it turns to alert. */
function Duration({ t, now }: { t: Task; now: number }) {
  const plan = t.plan?.duration;
  const ran = t.startedAt ? durationMs(t.startedAt, t.endedAt, now) : 0;
  if (!plan) return <>{t.startedAt ? formatDuration(ran) : "—"}</>;
  const min = Math.round(ran / MIN);
  return (
    <Meter
      label={`Duração de ${t.id}`}
      pct={Math.min(100, Math.round((min / plan) * 100))}
      tone={min > plan ? "warn" : taskTone(t)}
      text={`${min}/${plan} min`}
      showValue
    />
  );
}

export function TaskTable({ tasks, start }: { tasks: Task[]; start?: string }) {
  const now = useNow();
  const agentOf = useTaskAgent();
  if (!tasks.length) return <Empty title="Sem tarefas">Esta sprint ainda não tem tarefas.</Empty>;
  // day shown only when the tasks start on more than one day
  const days = new Set(tasks.filter((t) => t.startedAt).map((t) => formatDate(t.startedAt ?? "")));
  const stamp = days.size > 1 ? formatDateTime : formatTime;
  const waves = [...new Set(tasks.map((t) => t.wave))].sort((a, b) => (a ?? 1e9) - (b ?? 1e9));
  return (
    <div className={s.scrollX}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>Tarefa</th>
            <th>Agente</th>
            <th>Estado</th>
            <th>Passos</th>
            <th>Início</th>
            <th>Fim previsto</th>
            <th>Duração</th>
            <th>Progresso</th>
            <th>Consumo</th>
          </tr>
        </thead>
        {waves.map((w) => {
          const group = tasks.filter((t) => t.wave === w);
          return (
            <tbody key={w ?? 0} data-wave={waveSlot(w)}>
              <tr className={s.waveHead}>
                <th colSpan={9} scope="rowgroup">
                  <span>{w ? `Onda ${w}` : "Sem onda"}</span>{" "}
                  <small className={s.muted}>
                    {group.filter((t) => t.done).length}/{group.length} concluídas
                  </small>
                </th>
              </tr>
              {group.map((t) => {
                const ag = agentOf(t);
                const end = taskEnd(t, start);
                return (
                  <tr key={t.id}>
                    <td>
                      <b>{t.id}</b> {t.title}
                    </td>
                    <td>
                      {ag ? (
                        <>
                          <span className={s.av} title={ag.name}>
                            {ag.label}
                          </span>{" "}
                          <small className={t.model ? undefined : s.muted}>
                            {[t.agent, modelName(t.model ?? t.plannedModel)]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Pill tone={taskTone(t)}>{TASK_LABEL[taskStatus(t)]}</Pill>
                    </td>
                    <td>
                      <Steps t={t} />
                    </td>
                    <td>{t.startedAt ? stamp(t.startedAt) : "—"}</td>
                    <td
                      className={end?.real ? undefined : s.muted}
                      title={end && (end.real ? "Fim real" : "Previsto pelo plano")}
                    >
                      {end ? stamp(new Date(end.ms).toISOString()) : "—"}
                    </td>
                    <td className={s.prog}>
                      <Duration t={t} now={now} />
                    </td>
                    <td className={s.prog}>
                      <Meter
                        label={`Progresso de ${t.id}`}
                        pct={taskPct(t)}
                        tone={taskTone(t)}
                        showValue
                      />
                    </td>
                    <td className={s.cons}>
                      <small className={t.consumption ? undefined : s.muted}>
                        {costLine(t.consumption)}
                      </small>
                      <Kinds c={t.consumption} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
