import { useState } from "react";
import type { Doc, Project, Task } from "../../data/types";
import { formatTokens, formatUsd } from "../../lib/format";
import { agentLabel, currentWave, sprintPct, taskPct, taskStatus } from "../../lib/progress";
import { runningAgents } from "../../lib/select";
import { dailySeries } from "../../lib/usage";
import { durationMs, formatDate, formatDuration, formatTime } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./c.module.css";
import {
  Accordion,
  Empty,
  Gantt,
  mainSprint,
  Meter,
  Panel,
  Pill,
  Steps,
  Tabs,
  taskTone,
} from "./ui";

const MIN = 60_000;
const STATUS = {
  active: ["ativa", "run"],
  planned: ["planejada", undefined],
  closed: ["fechada", "ok"],
} as const;
const TASK_LABEL = { done: "feita", failed: "reprovada", running: "rodando", todo: "a fazer" };

function TaskTable({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <Empty title="Sem tarefas">Esta sprint ainda não tem tarefas.</Empty>;
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>Tarefa</th>
          <th>Estado</th>
          <th>Passos</th>
          <th className={s.r}>%</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id}>
            <td>
              <b>{t.id}</b> {t.title}
            </td>
            <td>
              <Pill tone={taskTone(t)}>{TASK_LABEL[taskStatus(t)]}</Pill>
            </td>
            <td>
              <Steps t={t} />
            </td>
            <td className={s.r}>{taskPct(t)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Spend({ values }: { values: number[] }) {
  const max = Math.max(0.01, ...values);
  return (
    <div className={s.cols7} role="img" aria-label="Gasto dos últimos 7 dias">
      {values.map((v, i) => (
        <i
          key={i}
          style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
          data-last={i === values.length - 1 || undefined}
        />
      ))}
    </div>
  );
}

export function ControlRoom({ project: p }: { project: Project }) {
  const { data } = useData();
  const now = useNow();
  const sprint = mainSprint(data, p.id);
  const tasks = sprint?.tasks ?? [];
  const agents = runningAgents(data, p.id);
  const days = dailySeries(data.usage, p.id).slice(-7);
  const today = days.at(-1);
  const wave = currentWave(tasks);
  const start = sprint?.startedAt;
  const runMs = start ? durationMs(start, sprint?.deliveredAt, now) : 0;
  const planMs = (sprint?.plannedMin ?? 0) * MIN;
  const adhoc = data.chats
    .filter((c) => c.projectId === p.id && !c.sprintId)
    .flatMap((c) => c.tasks);
  return (
    <>
      <div className={s.pageHead}>
        <h1>{p.name} › Sala de controle</h1>
        <p className={s.muted}>
          {sprint ? `${sprint.id} · ${sprint.title}` : "Sem sprint"}
          {sprint && ` · onda ${wave.current} de ${wave.total}`}
        </p>
      </div>
      <div className={s.board}>
        <Panel title="Andamento" aside={<Pill tone="run">{sprintPct(tasks)}%</Pill>}>
          <dl className={s.facts}>
            <div>
              <dt>Início</dt>
              <dd>{start ? formatTime(start) : "—"}</dd>
            </div>
            <div>
              <dt>Corrido</dt>
              <dd>{start ? formatDuration(runMs) : "—"}</dd>
            </div>
            <div>
              <dt>Previsto</dt>
              <dd>{formatDuration(planMs)}</dd>
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
          <Gantt tasks={tasks} />
        </Panel>
        <Panel title="Tarefas da sprint" wide>
          <TaskTable tasks={tasks} />
        </Panel>
        <Panel title="Agentes" aside={<span className={s.muted}>{agents.length} rodando</span>}>
          {agents.length ? (
            <ul className={s.agents}>
              {agents.map((a) => (
                <li key={a.id}>
                  <span className={s.av}>{agentLabel(a.kind, a.name)}</span>
                  <span>
                    {a.name}
                    <small className={s.muted}>{a.doing}</small>
                  </span>
                  <Meter label={`Contexto de ${a.name}`} pct={a.contextPct} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nenhum agente rodando">
              Os agentes aparecem aqui quando uma tarefa começa.
            </Empty>
          )}
        </Panel>
        <Panel title="Consumo">
          <div className={s.bigRow}>
            <strong className={s.big}>{formatUsd(today?.usd ?? 0)}</strong>
            <span className={s.muted}>hoje · {formatTokens(today?.tokens ?? 0)} tokens</span>
          </div>
          <Spend values={days.map((d) => d.usd)} />
          <span className={s.muted}>Gasto da sprint: {formatUsd(sprint?.usd ?? 0)}</span>
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
const DEMO: Task[] = [
  {
    id: "T01",
    title: "Feita e aprovada",
    done: true,
    startedAt: "x",
    review: "pass",
    plan: plan(0, 10),
  },
  {
    id: "T02",
    title: "Reprovada na revisão",
    done: false,
    startedAt: "x",
    steps: 3,
    review: "fail",
    plan: plan(10, 12),
  },
  { id: "T03", title: "Rodando", done: false, startedAt: "x", steps: 1, plan: plan(10, 8) },
  { id: "T04", title: "A fazer", done: false, plan: plan(22, 6) },
];

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
          <Gantt tasks={DEMO} />
        </Panel>
      </div>
    </>
  );
}
