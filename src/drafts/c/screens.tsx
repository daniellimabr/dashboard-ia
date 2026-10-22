import { useState } from "react";
import type { Agent, Doc, Project, Sprint, Task } from "../../data/types";
import { formatTokens, formatUsd } from "../../lib/format";
import { agentLabel, currentWave, sprintPct, taskPct, taskStatus } from "../../lib/progress";
import { runningAgents } from "../../lib/select";
import { dailySeries } from "../../lib/usage";
import { durationMs, formatDate, formatDuration, formatTime, formatWeekday } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./c.module.css";
import {
  Accordion,
  Empty,
  Ex,
  Gantt,
  idleGaps,
  mainSprint,
  Meter,
  Panel,
  Pill,
  Steps,
  Tabs,
  taskTone,
  Tip,
  type Wait,
  waveSlot,
} from "./ui";

const MIN = 60_000;
const STATUS = {
  active: ["ativa", "run"],
  planned: ["planejada", undefined],
  closed: ["fechada", "ok"],
} as const;
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

function TaskTable({ tasks }: { tasks: Task[] }) {
  const now = useNow();
  const agentOf = useTaskAgent();
  if (!tasks.length) return <Empty title="Sem tarefas">Esta sprint ainda não tem tarefas.</Empty>;
  const waves = [...new Set(tasks.map((t) => t.wave))].sort((a, b) => (a ?? 0) - (b ?? 0));
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
            <th>Fim</th>
            <th>Duração</th>
            <th>Progresso</th>
          </tr>
        </thead>
        {waves.map((w) => {
          const group = tasks.filter((t) => t.wave === w);
          return (
            <tbody key={w ?? 0} data-wave={waveSlot(w)}>
              {w && (
                <tr className={s.waveHead}>
                  <th colSpan={8} scope="rowgroup">
                    <span>Onda {w}</span>{" "}
                    <small className={s.muted}>
                      {group.filter((t) => t.done).length}/{group.length} concluídas
                    </small>
                  </th>
                </tr>
              )}
              {group.map((t) => {
                const ag = agentOf(t);
                return (
                  <tr key={t.id}>
                    <td>
                      <b>{t.id}</b> {t.title}
                    </td>
                    <td>
                      {ag ? (
                        <span className={s.av} title={ag.name}>
                          {ag.label}
                        </span>
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
                    <td>{t.startedAt ? formatTime(t.startedAt) : "—"}</td>
                    <td>{t.endedAt ? formatTime(t.endedAt) : "—"}</td>
                    <td>
                      {t.startedAt ? formatDuration(durationMs(t.startedAt, t.endedAt, now)) : "—"}
                    </td>
                    <td className={s.prog}>
                      <Meter
                        label={`Progresso de ${t.id}`}
                        pct={taskPct(t)}
                        tone={taskTone(t)}
                        showValue
                      />
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

// Illustrative waits (min after sprint start): the data has no reply/limit events yet (S09).
const EXAMPLE_WAITS = [
  { kind: "reply", at: 25, min: 5 },
  { kind: "limit", at: 40, min: 12 },
] as const;

const AGENT_STATE = {
  off: ["desativado", undefined],
  test: ["aguardando teste", "warn"],
  work: ["trabalhando", "run"],
  idle: ["ocioso", undefined],
} as const;

function agentState(a: Agent, tasks: Task[], sprint?: Sprint): keyof typeof AGENT_STATE {
  if (a.endedAt) return "off";
  if (sprint?.deliveredAt && !sprint.closedAt) return "test";
  const mine = tasks.find((t) => t.id === a.task);
  if (mine ? taskStatus(mine) === "running" : tasks.some((t) => taskStatus(t) === "running"))
    return "work";
  return "idle";
}

/** Tasks an agent touched: its own task, tasks planned for its kind, reviews for the Reviewer. */
const agentTasks = (a: Agent, tasks: Task[]) =>
  tasks.filter(
    (t) =>
      t.id === a.task ||
      (a.kind !== "clone" && t.agent === a.kind) ||
      (a.kind === "reviewer" && t.review),
  );

function Agents({
  agents,
  tasks,
  sprint,
  now,
  usd,
  tokPerUsd,
}: {
  agents: Agent[];
  tasks: Task[];
  sprint?: Sprint;
  now: number;
  usd: number;
  tokPerUsd: number;
}) {
  if (!agents.length)
    return (
      <Empty title="Nenhum agente nesta sprint">
        Os agentes aparecem aqui quando uma tarefa começa.
      </Empty>
    );
  const ms = agents.map((a) => durationMs(a.startedAt, a.endedAt, now));
  const total = ms.reduce((x, y) => x + y, 0) || 1;
  return (
    <ul className={s.agents}>
      {agents.map((a, i) => {
        const [label, tone] = AGENT_STATE[agentState(a, tasks, sprint)];
        const cost = (usd * (ms[i] ?? 0)) / total;
        const mine = agentTasks(a, tasks);
        return (
          <li key={a.id} data-off={a.endedAt ? true : undefined}>
            <details>
              <summary>
                <span className={s.av}>{agentLabel(a.kind, a.name)}</span>
                <span>
                  {a.name} <Pill tone={tone}>{label}</Pill>
                  <small className={s.muted}>
                    {formatUsd(cost)} · {formatTokens(cost * tokPerUsd)} tokens <Ex />
                  </small>
                </span>
                <Meter label={`Contexto de ${a.name}`} pct={a.endedAt ? undefined : a.contextPct} />
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
                <p className={s.muted}>{a.doing ?? "Sem tarefa nesta sprint."}</p>
              )}
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function ControlRoom({ project: p }: { project: Project }) {
  const { data } = useData();
  const now = useNow();
  const sprint = mainSprint(data, p.id);
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
  const tokPerUsd =
    days.reduce((x, d) => x + d.tokens, 0) / (days.reduce((x, d) => x + d.usd, 0) || 1);
  const wave = currentWave(tasks);
  const start = sprint?.startedAt;
  const endAt = sprint?.closedAt ?? sprint?.deliveredAt;
  const runMs = start ? durationMs(start, endAt, now) : 0;
  const planMs = (sprint?.plannedMin ?? 0) * MIN;
  const t0 = start ? Date.parse(start) : now;
  const t1 = endAt ? Date.parse(endAt) : now;
  const idle = start ? idleGaps(tasks, t0, t1) : [];
  const example: Wait[] = start
    ? EXAMPLE_WAITS.map((w) => ({
        kind: w.kind,
        start: t0 + w.at * MIN,
        end: Math.min(t1, t0 + (w.at + w.min) * MIN),
      })).filter((w) => w.end > w.start)
    : [];
  const sum = (ws: Wait[]) => ws.reduce((x, w) => x + w.end - w.start, 0);
  const adhoc = chats.filter((c) => !c.sprintId).flatMap((c) => c.tasks);
  const done = tasks.filter((t) => t.done).length;
  return (
    <>
      <div className={s.pageHead}>
        <h1>{p.name} › Sala de controle</h1>
        <p className={s.muted}>
          {sprint ? `${sprint.id} · ${sprint.title}` : "Sem sprint"}
          {sprint && ` · onda ${wave.current} de ${wave.total}`}
        </p>
      </div>
      <div className={s.ctl}>
        <Panel title="Andamento" aside={<Pill tone="run">{sprintPct(tasks)}%</Pill>}>
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
              <dt>Ocioso</dt>
              <dd>{start ? formatDuration(sum(idle)) : "—"}</dd>
            </div>
            <div>
              <dt>
                Aguardando limite <Ex />
              </dt>
              <dd>
                {start ? formatDuration(sum(example.filter((w) => w.kind === "limit"))) : "—"}
              </dd>
            </div>
          </dl>
          <Meter
            label="Tempo corrido sobre o previsto"
            pct={planMs ? Math.round((runMs / planMs) * 100) : 0}
          />
          {p.alerts?.map((a) => (
            <div key={a.title} className={s.alert} data-tone={a.tone}>
              <b>{a.title}</b>
              <span>{a.detail}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Plano no tempo">
          <Gantt tasks={tasks} start={start} now={now} waits={idle} example={example} />
        </Panel>
        <Panel
          title="Agentes"
          aside={<span className={s.muted}>{agents.filter((a) => !a.endedAt).length} ativos</span>}
        >
          <Agents
            agents={agents}
            tasks={tasks}
            sprint={sprint}
            now={now}
            usd={sprint?.usd ?? 0}
            tokPerUsd={tokPerUsd}
          />
        </Panel>
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
          <TaskTable tasks={tasks} />
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

export function SprintList({ project: p }: { project: Project }) {
  const { data } = useData();
  const sprints = data.sprints
    .filter((x) => x.projectId === p.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  // Doc ids are "SNN-plan" (mock) or "<project>:docs/sprints/SNN-plan.md" (repo): match on the file name.
  const hasDoc = (id: string, kind: Doc["kind"]) =>
    data.docs.some(
      (d) => d.projectId === p.id && d.kind === kind && d.id.split("/").pop()?.startsWith(`${id}-`),
    );
  return (
    <>
      <div className={s.pageHead}>
        <h1>{p.name} › Sprints</h1>
        <p className={s.muted}>{sprints.length} sprints, a mais recente primeiro.</p>
      </div>
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
              open={x.status === "active"}
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
                Sprint plan: {hasDoc(x.id, "sprint-plan") ? "disponível" : "ainda não existe"} ·
                Release Report: {hasDoc(x.id, "release-report") ? "disponível" : "ainda não existe"}{" "}
                · gasto {formatUsd(x.usd ?? 0)}
              </p>
              <TaskTable tasks={x.tasks} />
            </Accordion>
          );
        })}
      </div>
    </>
  );
}

const plan = (start: number, duration: number) => ({ start, duration, deps: [] });
const DEMO_T0 = Date.now() - 30 * MIN; // demo sprint started 30 min before load
const ago = (m: number) => new Date(DEMO_T0 + m * MIN).toISOString();
const DEMO: Task[] = [
  {
    id: "T01",
    title: "Feita e aprovada",
    done: true,
    startedAt: ago(0),
    endedAt: ago(9),
    review: "pass",
    plan: plan(0, 10),
    wave: 1,
  },
  {
    id: "T02",
    title: "Reprovada na revisão",
    done: false,
    startedAt: ago(10),
    endedAt: ago(19),
    steps: 3,
    review: "fail",
    plan: plan(10, 12),
    wave: 2,
  },
  {
    id: "T03",
    title: "Rodando",
    done: false,
    startedAt: ago(24),
    steps: 1,
    plan: plan(10, 8),
    wave: 2,
  },
  { id: "T04", title: "A fazer", done: false, plan: plan(22, 6), wave: 3 },
];
const DEMO_IDLE = idleGaps(DEMO, DEMO_T0, DEMO_T0 + 30 * MIN);

export function ComponentSheet() {
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  return (
    <>
      <div className={s.pageHead}>
        <h1>Componentes</h1>
        <p className={s.muted}>As peças com que as telas da direção C são montadas.</p>
      </div>
      <div className={s.board}>
        <Panel title="Botões">
          <div className={s.row}>
            <button type="button" className={s.btn}>
              Aprovar sprint
            </button>
            <button type="button" className={s.btn} data-kind="ghost">
              Trazer para ativos
            </button>
            <button type="button" className={s.btn} disabled>
              Fechar sprint
            </button>
          </div>
        </Panel>
        <Panel title="Selos de estado">
          <div className={s.row}>
            <Pill tone="ok">feita</Pill>
            <Pill tone="run" live>
              Execução
            </Pill>
            <Pill tone="warn">aguardando teste</Pill>
            <Pill tone="bad">reprovada</Pill>
            <Pill>planejada</Pill>
          </div>
        </Panel>
        <Panel title="Cartão (painel)" aside={<Pill tone="run">ativa</Pill>}>
          <p>
            Todo conteúdo vive em painéis, com título à esquerda e estado à direita. O painel do
            projeto em foco ocupa a largura toda.
          </p>
        </Panel>
        <Panel title="Medidores">
          <div className={s.stack}>
            <Meter label="Exemplo 35%" pct={35} tone="run" />
            <Meter label="Exemplo 65%" pct={65} />
            <Meter label="Exemplo 90%" pct={90} />
            <Meter label="Exemplo sem dado" />
            <Meter label="Exemplo com valor na barra" pct={60} tone="run" showValue />
          </div>
        </Panel>
        <Panel title="Abas">
          <Tabs
            label="Exemplo de abas"
            items={[
              ["a", "S08 · ativa"],
              ["b", "S07 · fechada"],
              ["c", "S06 · fechada"],
            ]}
            value={tab}
            onChange={setTab}
          />
        </Panel>
        <Panel title="Estado vazio">
          <Empty title="Nenhum chat aberto">
            Abra um chat no projeto para ver os agentes aqui.
          </Empty>
        </Panel>
        <Panel title="Tabela" wide>
          <TaskTable tasks={DEMO} />
        </Panel>
        <Panel title="Acordeão">
          <Accordion
            open
            summary={
              <span className={s.accSum}>
                <b>S07</b>
                <span>Nomes dos chats</span>
              </span>
            }
          >
            <p className={s.muted}>Os detalhes da sprint aparecem ao abrir.</p>
          </Accordion>
        </Panel>
        <Panel title="Plano no tempo">
          <Gantt tasks={DEMO} start={ago(0)} waits={DEMO_IDLE} />
        </Panel>
      </div>
    </>
  );
}
