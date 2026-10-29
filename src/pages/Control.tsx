import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import s from "../components/ui.module.css";
import {
  Empty,
  Gantt,
  idleGaps,
  mainSprint,
  Meter,
  Panel,
  Pill,
  TaskTable,
  Tip,
  type Pause,
} from "../components/ui";
import type { Agent, Project, Sprint, Task } from "../data/types";
import { formatTokens, formatUsd } from "../lib/format";
import { resetLabel } from "../lib/limits";
import { agentLabel, currentWave, sprintPct, taskStatus } from "../lib/progress";
import { runningAgents } from "../lib/select";
import { durationMs, formatDate, formatDuration, formatTime, formatWeekday } from "../lib/time";
import { dailySeries } from "../lib/usage";
import { useBoard } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";

const MIN = 60_000;

function Spend({ days }: { days: { date: string; usd: number; tokens: number }[] }) {
  const max = Math.max(0.01, ...days.map((d) => d.usd));
  return (
    <figure className={s.spend}>
      <figcaption className={s.k}>Gasto por dia (US$), últimos 7 dias</figcaption>
      <div className={s.cols7}>
        {days.map((d, i) => (
          <span
            key={d.date}
            className={s.tipHost}
            tabIndex={0}
            aria-label={`${formatDate(d.date + "T12:00:00Z")}: ${formatUsd(d.usd)}, ${formatTokens(d.tokens)} tokens`}
            style={{ height: `${Math.max(4, (d.usd / max) * 100)}%` }}
            data-last={i === days.length - 1 || undefined}
          >
            <Tip>
              {formatDate(d.date + "T12:00:00Z")} · {formatUsd(d.usd)} · {formatTokens(d.tokens)}{" "}
              tokens
            </Tip>
          </span>
        ))}
      </div>
      <div className={s.cols7Axis} aria-hidden="true">
        {days.map((d) => (
          <span key={d.date}>{formatWeekday(d.date + "T12:00:00Z")}</span>
        ))}
      </div>
    </figure>
  );
}

const AGENT_STATE = {
  off: ["desativado", undefined],
  test: ["aguardando teste", "warn"],
  work: ["trabalhando", "run"],
  idle: ["ocioso", undefined],
} as const;

const RANK = { work: 0, test: 1, idle: 2, off: 3 } as const; // active first

function agentState(a: Agent, tasks: Task[], sprint?: Sprint): keyof typeof AGENT_STATE {
  if (a.endedAt) return "off";
  if (sprint?.deliveredAt && !sprint.closedAt) return "test";
  const mine = tasks.find((t) => t.id === a.task); // current task; agentId is history
  if (mine ? taskStatus(mine) === "running" : tasks.some((t) => taskStatus(t) === "running"))
    return "work";
  return "idle";
}

/** Tasks an agent touched: tagged with its id, its own task, planned for its kind, reviews for the Reviewer. */
const agentTasks = (a: Agent, tasks: Task[], agents: Agent[]) =>
  tasks.filter(
    (t) =>
      t.agentId === a.id ||
      t.id === a.task ||
      (a.kind !== "clone" && t.agent === a.kind) ||
      (a.kind === "reviewer" && t.review) ||
      // A clone the harness gave no task: running tasks planned for clones that no other agent took.
      (a.kind === "clone" &&
        !a.task &&
        !a.endedAt &&
        t.agent === "clone" &&
        taskStatus(t) === "running" &&
        !agents.some((o) => o !== a && (o.task === t.id || o.id === t.agentId))),
  );

/** How many list rows fit the list's own (CSS-limited) height; Infinity until measured. */
function useFit(ref: RefObject<HTMLUListElement | null>, count: number) {
  const [fit, setFit] = useState(Infinity);
  useLayoutEffect(() => {
    const ul = ref.current;
    if (!ul) return;
    const measure = () => {
      const row = (ul.firstElementChild as HTMLElement | null)?.offsetHeight;
      const gap = parseFloat(getComputedStyle(ul).rowGap) || 0;
      if (row && ul.clientHeight)
        setFit(Math.max(1, Math.floor((ul.clientHeight + gap) / (row + gap))));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [ref, count]);
  return fit;
}

function Agents({ agents, tasks, sprint }: { agents: Agent[]; tasks: Task[]; sprint?: Sprint }) {
  const [all, setAll] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const fit = useFit(list, agents.length);
  if (!agents.length)
    return (
      <Panel title="Agentes">
        <Empty title="Nenhum agente nesta sprint">
          Os agentes aparecem aqui quando uma tarefa começa.
        </Empty>
      </Panel>
    );
  const rows = agents
    .map((a) => ({ a, state: agentState(a, tasks, sprint) }))
    .sort((x, y) => RANK[x.state] - RANK[y.state]);
  const shown = all ? rows : rows.slice(0, fit);
  const working = rows.filter((r) => r.state === "work").length;
  return (
    <Panel
      title="Agentes"
      aside={
        <span className={s.row}>
          <span className={s.muted}>
            {working}/{rows.length} ativos
          </span>
          {rows.length > fit && (
            <button
              type="button"
              className={s.chev}
              aria-label={all ? "Mostrar menos" : "Mostrar todos os agentes"}
              aria-expanded={all}
              onClick={() => setAll(!all)}
            >
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path
                  d={all ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
          )}
        </span>
      }
    >
      <ul className={s.agents} ref={list} data-all={all || undefined}>
        {shown.map(({ a, state }) => {
          const [label, tone] = AGENT_STATE[state];
          const mine = agentTasks(a, tasks, agents);
          return (
            <li key={a.id} data-off={a.endedAt ? true : undefined}>
              <details>
                <summary>
                  <span className={s.av}>{agentLabel(a.kind, a.name)}</span>
                  <span>
                    {a.name} <Pill tone={tone}>{label}</Pill>
                    <small className={s.muted}>
                      {a.usd === undefined ? "custo sem dado" : formatUsd(a.usd)} ·{" "}
                      {a.tokens === undefined
                        ? "tokens sem dado"
                        : `${formatTokens(a.tokens)} tokens`}
                    </small>
                  </span>
                </summary>
                {mine.length ? (
                  <ul className={s.agentTasks}>
                    {mine.map((t) => (
                      <li key={t.id}>
                        <b>{t.id}</b> {t.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={s.muted}>
                    {a.doing ??
                      (a.kind === "clone"
                        ? "Tarefa não informada pelo harness"
                        : "Sem tarefa nesta sprint.")}
                  </p>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** 5 h and weekly limits: %, countdown to the reset and its time; 100% stands out. */
function Limits({ now }: { now: number }) {
  const { h5, week } = useData().data.limits;
  const rows = [
    {
      name: "Limite 5 h",
      pct: h5.pct,
      reset: resetLabel(h5.resetsAt, now, false),
      est: h5.estimated,
    },
    { name: "Semanal", pct: week?.pct, reset: resetLabel(week?.resetsAt, now, true) },
  ];
  return (
    <section className={s.limitBar} aria-label="Limites de uso">
      {rows.map((l) => (
        <div key={l.name} data-tone={(l.pct ?? 0) >= 100 ? "bad" : undefined}>
          <span>{l.name}</span>
          <b>{l.pct === undefined ? "sem dado" : `${l.pct}%`}</b>
          <Meter label={l.name} pct={l.pct} />
          <span>{l.est ? "estimado" : l.reset.countdown}</span>
          <span className={s.muted}>{l.reset.at}</span>
        </div>
      ))}
    </section>
  );
}

function ControlRoom({ project: p }: { project: Project }) {
  const { data } = useData();
  const now = useNow();
  const [params] = useSearchParams();
  const sprint =
    data.sprints.find((x) => x.projectId === p.id && x.id === params.get("s")) ??
    mainSprint(data, p.id);
  const tasks = sprint?.tasks ?? [];
  const chats = data.chats.filter((c) => c.projectId === p.id);
  const agents = [
    ...new Set([
      ...chats.filter((c) => sprint && c.sprintId === sprint.id).flatMap((c) => c.agents),
      ...runningAgents(data, p.id),
    ]),
  ];
  const days = dailySeries(data.usage, p.id).slice(-7);
  const today = days.at(-1);
  const wave = currentWave(tasks);
  const start = sprint?.startedAt;
  const endAt = sprint?.closedAt ?? sprint?.deliveredAt;
  const runMs = start ? durationMs(start, endAt, now) : 0;
  const planMs = (sprint?.plannedMin ?? 0) * MIN;
  const t0 = start ? Date.parse(start) : now;
  const t1 = endAt ? Date.parse(endAt) : now;
  const idle = start ? idleGaps(tasks, t0, t1) : [];
  const waits: Pause[] | undefined = sprint?.waits?.map((w) => ({
    kind: w.kind,
    start: Date.parse(w.start),
    end: Date.parse(w.end),
  }));
  const sum = (ws: Pause[]) => ws.reduce((x, w) => x + w.end - w.start, 0);
  const waited = (kind: Pause["kind"]) =>
    waits ? formatDuration(sum(waits.filter((w) => w.kind === kind))) : "sem dado";
  const adhoc = chats.filter((c) => !c.sprintId).flatMap((c) => c.tasks);
  const done = tasks.filter((t) => t.done).length;
  return (
    <>
      <div className={s.pageHead}>
        <h1>{p.name} › Sala de controle</h1>
        <p className={s.muted}>
          {sprint ? `${sprint.id} · ${sprint.title}` : "Sem sprint"}
          {sprint && (wave.total ? ` · onda ${wave.current} de ${wave.total}` : " · onda sem dado")}
        </p>
      </div>
      <Limits now={now} />
      <div className={s.ctl}>
        <Panel title="Andamento">
          <dl className={s.facts}>
            <div>
              <dt>Início</dt>
              <dd>{start ? formatTime(start) : "—"}</dd>
            </div>
            <div>
              <dt>{endAt ? "Fim" : "Fim previsto"}</dt>
              <dd>
                {endAt
                  ? formatTime(endAt)
                  : start && planMs
                    ? formatTime(new Date(t0 + planMs).toISOString())
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Corrido</dt>
              <dd>{start ? formatDuration(runMs) : "—"}</dd>
            </div>
            <div>
              <dt>Previsto</dt>
              <dd>{formatDuration(planMs)}</dd>
            </div>
            <div>
              <dt>Corrido/previsto</dt>
              <dd>{planMs ? `${Math.round((runMs / planMs) * 100)}%` : "—"}</dd>
            </div>
            <div>
              <dt>Ocioso</dt>
              <dd>{start ? formatDuration(sum(idle)) : "—"}</dd>
            </div>
            <div>
              <dt>Aguardando você</dt>
              <dd>{waited("reply")}</dd>
            </div>
            <div>
              <dt>Aguardando limite</dt>
              <dd>{waited("limit")}</dd>
            </div>
          </dl>
          <Meter
            label="Progresso da sprint"
            pct={sprintPct(tasks)}
            tone={sprintPct(tasks) === 100 ? "ok" : "run"}
            showValue
          />
          {p.alerts?.map((a) => (
            <div key={a.title} className={s.alert} data-tone={a.tone}>
              <b>{a.title}</b>
              <span>{a.detail}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Plano no tempo">
          <Gantt tasks={tasks} start={start} now={t1} waits={[...idle, ...(waits ?? [])]} />
        </Panel>
        <Agents agents={agents} tasks={tasks} sprint={sprint} />
        <Panel title="Consumo">
          <div className={s.bigRow}>
            <strong className={s.big}>{formatUsd(today?.usd ?? 0)}</strong>
            <span className={s.muted}>hoje · {formatTokens(today?.tokens ?? 0)} tokens</span>
          </div>
          <Spend days={days} />
          <span className={s.muted}>Gasto da sprint: {formatUsd(sprint?.usd ?? 0)}</span>
        </Panel>
        <Panel
          title="Tarefas da sprint"
          wide
          aside={
            <span className={s.muted}>
              {done} / {tasks.length} concluídas
            </span>
          }
        >
          <TaskTable tasks={tasks} start={start} />
        </Panel>
        {adhoc.length > 0 && (
          <Panel title="Fora da sprint" wide>
            <TaskTable tasks={adhoc} />
          </Panel>
        )}
      </div>
    </>
  );
}

export function Control() {
  const board = useBoard();
  const { data } = useData();
  const [params] = useSearchParams();
  const project = data.projects.find((x) => x.id === params.get("p")) ?? board.project;
  if (!project)
    return (
      <div className={s.pageHead}>
        <h1>Sala de controle</h1>
        <Empty title="Nenhum projeto ativo">Escolha um projeto no menu lateral.</Empty>
      </div>
    );
  return <ControlRoom project={project} />;
}
