import { useState } from "react";
import type { Data, Project, Sprint, Task } from "../../data/types";
import { formatTokens, formatUsd } from "../../lib/format";
import { agentLabel, currentWave, sprintPct, taskPct, taskStatus } from "../../lib/progress";
import { runningAgents } from "../../lib/select";
import { durationMs, formatDate, formatDuration, formatTime } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./a.module.css";
import { Accordion, Badge, Card, Empty, Meter, Steps, TASK_LABEL, Tabs, taskTone } from "./ui";

const DAY = 864e5;
const STATUS = { active: "ativa", planned: "planejada", closed: "fechada" } as const;
const STATUS_TONE = { active: "run", planned: "warn", closed: "ok" } as const;

/** Active sprint, else planned, else the last closed one (same rule as the Sala de controle). */
export const mainSprint = (data: Data, pid: string): Sprint | undefined => {
  const mine = data.sprints.filter((x) => x.projectId === pid);
  return (
    mine.find((x) => x.status === "active") ??
    mine.find((x) => x.status === "planned") ??
    mine
      .filter((x) => x.status === "closed")
      .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))[0]
  );
};

const currentTask = (tasks: Task[]) =>
  tasks.find((t) => ["running", "failed"].includes(taskStatus(t))) ?? tasks.find((t) => !t.done);

const weekUsd = (data: Data, pid: string, now: number) => {
  const from = new Date(now - 6 * DAY).toISOString().slice(0, 10);
  return data.usage
    .filter((u) => u.projectId === pid && u.date >= from)
    .reduce((a, u) => a + u.usd, 0);
};

function Row({ p, now }: { p: Project; now: number }) {
  const { data } = useData();
  const sprint = mainSprint(data, p.id);
  const tasks = sprint?.tasks ?? [];
  const task = currentTask(tasks);
  const pct = sprintPct(tasks);
  const chats = data.chats.filter((c) => c.projectId === p.id && !c.endedAt);
  const tone = p.phase?.tone ?? "idle";
  return (
    <section className={`${s.row} ${s["r-" + tone]}`} aria-label={p.name}>
      <div className={s.cell}>
        <h2>{p.name}</h2>
        {p.phase && (
          <Badge tone={p.phase.tone} live={p.phase.live}>
            {p.phase.label}
          </Badge>
        )}
      </div>
      <div className={s.cell}>
        {sprint ? (
          <>
            <span>
              <b className={s.num}>{sprint.id}</b> {sprint.title}
            </span>
            {task ? (
              <span className={s.task}>
                <b className={s.num}>{task.id}</b> {task.title} <Steps t={task} />
              </span>
            ) : (
              <span className={s.muted}>todas as tarefas feitas</span>
            )}
          </>
        ) : (
          <span className={s.muted}>sem sprint</span>
        )}
      </div>
      <div className={s.cell}>
        <span className={s.big}>{pct}%</span>
        <Meter label={`Progresso da sprint de ${p.name}`} pct={pct} tone="run" />
        <small className={s.muted}>
          {tasks.filter((t) => t.done).length}/{tasks.length} tarefas
        </small>
      </div>
      <div className={s.cell}>
        <span className={s.big}>{formatUsd(sprint?.usd ?? 0)}</span>
        <small className={s.muted}>
          sprint · <span className={s.num}>{formatUsd(weekUsd(data, p.id, now))}</span> na semana
        </small>
      </div>
      <div className={s.cell}>
        <small className={s.muted}>
          <b className={s.num}>{chats.length}</b> chat{chats.length === 1 ? "" : "s"} aberto
          {chats.length === 1 ? "" : "s"}
        </small>
        {chats.map((c) => (
          <span key={c.id} className={s.chat}>
            {c.title}
            <span className={s.num}>{formatTime(c.startedAt)}</span>
          </span>
        ))}
      </div>
      <div className={s.cell}>
        {p.alerts?.length ? (
          p.alerts.map((a) => (
            <span key={a.title} className={s.alert}>
              <Badge tone={a.tone}>{a.tone === "bad" ? "erro" : "atenção"}</Badge>
              <span>
                <b>{a.title}</b> <small className={s.muted}>{a.detail}</small>
              </span>
            </span>
          ))
        ) : (
          <small className={s.muted}>sem alertas</small>
        )}
      </div>
    </section>
  );
}

export function Home({
  active,
  idle,
  onPromote,
}: {
  active: Project[];
  idle: Project[];
  onPromote: (id: string) => void;
}) {
  const { data } = useData();
  const now = useNow();
  const waiting = active.filter((p) => p.alerts?.length).length;
  return (
    <>
      <p className={s.lede}>
        <b className={s.num}>{waiting}</b> de <b className={s.num}>{active.length}</b> projetos
        esperam você. Último comando às <b className={s.num}>{formatTime(data.lastCommand.at)}</b>.
      </p>
      <div className={s.board} role="list" aria-label="Projetos ativos">
        <div className={s.head} aria-hidden>
          <span>Projeto</span>
          <span>Sprint e tarefa atual</span>
          <span>Progresso</span>
          <span>Gasto</span>
          <span>Chats</span>
          <span>Alertas</span>
        </div>
        {active.map((p) => (
          <Row key={p.id} p={p} now={now} />
        ))}
      </div>
      <section aria-label="Ociosos" className={s.idleBox}>
        <h2>Ociosos · sem atividade há mais de 7 dias</h2>
        {idle.length ? (
          <table className={s.table}>
            <tbody>
              {idle.map((p) => {
                const last = data.sprints.filter((x) => x.projectId === p.id).at(-1);
                const days = Math.floor((now - Date.parse(p.lastActivityAt)) / DAY);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className={s.muted}>
                      {last ? `${last.id} ${STATUS[last.status]}` : "sem sprint"}
                    </td>
                    <td className={s.r}>
                      <span className={s.num}>{days}d</span> parado
                    </td>
                    <td className={s.r}>
                      <span className={s.num}>{formatUsd(weekUsd(data, p.id, now))}</span> na semana
                    </td>
                    <td className={s.r}>
                      <button type="button" className={s.btn} onClick={() => onPromote(p.id)}>
                        Trazer para ativos
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Empty title="Nenhum projeto ocioso">
            Todos os projetos tiveram atividade nos últimos 7 dias.
          </Empty>
        )}
      </section>
    </>
  );
}

function Gantt({ tasks }: { tasks: Task[] }) {
  const planned = tasks.filter((t) => t.plan);
  if (!planned.length)
    return <Empty title="Sem plano de horários">As tarefas desta sprint não têm previsão.</Empty>;
  const total = Math.max(...planned.map((t) => (t.plan?.start ?? 0) + (t.plan?.duration ?? 0)));
  return (
    <div className={s.gantt} role="img" aria-label="Linha do tempo prevista das tarefas">
      {planned.map((t) => (
        <div key={t.id} className={s.grow}>
          <span className={s.num}>{t.id}</span>
          <span className={s.lane}>
            <i
              className={s[taskTone(t)]}
              title={`${t.id} · ${t.title} · ${t.plan?.duration} min · ${TASK_LABEL[taskStatus(t)]}`}
              style={{
                left: `${((t.plan?.start ?? 0) / total) * 100}%`,
                width: `${((t.plan?.duration ?? 0) / total) * 100}%`,
              }}
            />
          </span>
          <span className={`${s.num} ${s.muted}`}>{t.plan?.duration}m</span>
        </div>
      ))}
    </div>
  );
}

export function TaskTable({
  tasks,
  agents = [],
}: {
  tasks: Task[];
  agents?: ReturnType<typeof runningAgents>;
}) {
  if (!tasks.length)
    return <Empty title="Sprint sem tarefas">O plano ainda não lista tarefas.</Empty>;
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>Id</th>
          <th>Tarefa</th>
          <th>Agente</th>
          <th>Etapas</th>
          <th>Estado</th>
          <th className={s.r}>%</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => {
          const ag = agents.find((a) => a.task === t.id);
          return (
            <tr key={t.id}>
              <td className={s.num}>{t.id}</td>
              <td>{t.title}</td>
              <td className={s.num}>
                {ag ? agentLabel(ag.kind, ag.name) : t.agent ? agentLabel(t.agent) : "--"}
              </td>
              <td>
                <Steps t={t} />
              </td>
              <td>
                <Badge tone={taskTone(t)} live={taskStatus(t) === "running"}>
                  {TASK_LABEL[taskStatus(t)]}
                </Badge>
              </td>
              <td className={`${s.r} ${s.num}`}>{taskPct(t)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ControlPanel({ p, now }: { p: Project; now: number }) {
  const { data } = useData();
  const initial = mainSprint(data, p.id);
  const recent = data.sprints
    .filter((x) => x.projectId === p.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
    .slice(0, 5);
  const [picked, setPicked] = useState(initial?.id);
  const sprint = recent.find((x) => x.id === picked) ?? initial;
  const tasks = sprint?.tasks ?? [];
  const agents = runningAgents(data, p.id);
  const usage = data.usage.filter((u) => u.projectId === p.id).slice(-7);
  const today = usage.at(-1);
  const maxUsd = Math.max(0.01, ...usage.map((u) => u.usd));
  const wave = currentWave(tasks);
  const start = sprint?.startedAt;
  const end = sprint?.deliveredAt;
  const runMs = start ? durationMs(start, end, now) : 0;
  const planMs = (sprint?.plannedMin ?? 0) * 60_000;
  return (
    <Card
      title={p.name}
      aside={
        p.phase && (
          <Badge tone={p.phase.tone} live={p.phase.live}>
            {p.phase.label}
          </Badge>
        )
      }
    >
      {recent.length > 1 && (
        <Tabs
          label={`Sprints de ${p.name}`}
          items={recent.map((x) => [x.id, `${x.id} ${STATUS[x.status]}`])}
          value={sprint?.id}
          onChange={setPicked}
        />
      )}
      {p.alerts?.map((a) => (
        <div key={a.title} className={s.alert}>
          <Badge tone={a.tone}>{a.tone === "bad" ? "erro" : "atenção"}</Badge>
          <span>
            <b>{a.title}</b> <small className={s.muted}>{a.detail}</small>
          </span>
        </div>
      ))}
      {sprint ? (
        <>
          <dl className={s.stats}>
            <div>
              <dt>progresso</dt>
              <dd>{sprintPct(tasks)}%</dd>
            </div>
            <div>
              <dt>onda</dt>
              <dd>
                {wave.current}/{wave.total}
              </dd>
            </div>
            <div>
              <dt>corrido</dt>
              <dd>{start ? formatDuration(runMs) : "--"}</dd>
            </div>
            <div>
              <dt>previsto</dt>
              <dd>{formatDuration(planMs)}</dd>
            </div>
            <div>
              <dt>gasto</dt>
              <dd>{formatUsd(sprint.usd ?? 0)}</dd>
            </div>
            <div>
              <dt>reprov.</dt>
              <dd>{tasks.filter((t) => t.review === "fail").length}</dd>
            </div>
          </dl>
          <Accordion
            title="Horários previstos"
            aside={
              <small className={s.muted}>
                {start ? `desde ${formatTime(start)}` : "não começou"}
              </small>
            }
            open
          >
            <Gantt tasks={tasks} />
          </Accordion>
          <Accordion
            title={`Tarefas da ${sprint.id}`}
            aside={
              <small
                className={s.num}
              >{`${tasks.filter((t) => t.done).length}/${tasks.length}`}</small>
            }
            open={sprint.status === "active"}
          >
            <TaskTable tasks={tasks} agents={agents} />
          </Accordion>
        </>
      ) : (
        <Empty title="Nenhuma sprint">Peça um sprint plan ao Tech Lead para começar.</Empty>
      )}
      <Accordion
        title="Agentes"
        aside={<small className={s.num}>{agents.length} rodando</small>}
        open={agents.length > 0}
      >
        {agents.length ? (
          <table className={s.table}>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td className={s.num}>{agentLabel(a.kind, a.name)}</td>
                  <td>{a.doing ?? a.name}</td>
                  <td className={`${s.r} ${s.num}`}>
                    {Math.floor(durationMs(a.startedAt, undefined, now) / 60_000)}m
                  </td>
                  <td className={s.r}>
                    <Meter label={`Contexto de ${a.name}`} pct={a.contextPct ?? 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title="Nenhum agente rodando" />
        )}
      </Accordion>
      <Accordion
        title="Consumo"
        aside={<small className={s.num}>{formatUsd(today?.usd ?? 0)} hoje</small>}
      >
        <div className={s.spark} role="img" aria-label="Gasto dos últimos 7 dias">
          {usage.map((u) => (
            <i
              key={u.date + (u.sprintId ?? "")}
              title={`${formatDate(u.date)} · ${formatUsd(u.usd)}`}
              style={{ height: `${(u.usd / maxUsd) * 100}%` }}
            />
          ))}
        </div>
        <small className={s.muted}>
          <span className={s.num}>{formatTokens(today?.tokens ?? 0)}</span> tokens hoje
        </small>
      </Accordion>
    </Card>
  );
}

export function Control({ active }: { active: Project[] }) {
  const now = useNow();
  return (
    <div className={s.cols}>
      {active.map((p) => (
        <ControlPanel key={p.id} p={p} now={now} />
      ))}
    </div>
  );
}

export function Sprints({ project }: { project: Project }) {
  const { data } = useData();
  const list = data.sprints
    .filter((x) => x.projectId === project.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  return (
    <>
      <h1 className={s.h1}>
        {project.name} <span className={s.muted}>› Sprints</span>
      </h1>
      {list.length ? (
        list.map((x) => {
          const done = x.tasks.filter((t) => t.done).length;
          return (
            <Accordion
              key={x.id}
              open={x.status === "active"}
              title={
                <>
                  <b className={s.num}>{x.id}</b> {x.title}
                </>
              }
              aside={
                <span className={s.sum}>
                  <Badge tone={STATUS_TONE[x.status]} live={x.status === "active"}>
                    {STATUS[x.status]}
                  </Badge>
                  <small className={s.num}>
                    {done}/{x.tasks.length}
                  </small>
                  <small className={`${s.num} ${s.muted}`}>
                    {x.startedAt
                      ? `${formatDate(x.startedAt)} – ${x.closedAt ? formatDate(x.closedAt) : "hoje"}`
                      : "não iniciada"}
                  </small>
                  <small className={s.num}>{formatUsd(x.usd ?? 0)}</small>
                  <Meter label={`Progresso de ${x.id}`} pct={sprintPct(x.tasks)} tone="run" />
                </span>
              }
            >
              {x.goal && <p className={s.muted}>{x.goal}</p>}
              <TaskTable tasks={x.tasks} />
            </Accordion>
          );
        })
      ) : (
        <Empty title="Nenhuma sprint ainda">Peça um sprint plan ao Tech Lead para começar.</Empty>
      )}
    </>
  );
}

export function Sheet() {
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const sample: Task[] = [
    { id: "T01", title: "Tarefa feita", done: true },
    {
      id: "T02",
      title: "Tarefa rodando",
      done: false,
      startedAt: new Date().toISOString(),
      steps: 2,
    },
    {
      id: "T03",
      title: "Tarefa reprovada",
      done: false,
      startedAt: new Date().toISOString(),
      steps: 3,
      review: "fail",
    },
    { id: "T04", title: "Tarefa a fazer", done: false },
  ];
  return (
    <div className={s.sheet}>
      <Card title="Botão">
        <div className={s.line}>
          <button type="button" className={`${s.btn} ${s.primary}`}>
            Aprovar plano
          </button>
          <button type="button" className={s.btn}>
            Ver a sprint
          </button>
          <button type="button" className={s.btn} disabled>
            Indisponível
          </button>
        </div>
      </Card>
      <Card title="Selo de estado">
        <div className={s.line}>
          <Badge tone="ok">feita</Badge>
          <Badge tone="run" live>
            rodando
          </Badge>
          <Badge tone="warn">esperando você</Badge>
          <Badge tone="bad">reprovada</Badge>
          <Badge tone="idle">a fazer</Badge>
        </div>
      </Card>
      <Card title="Medidor">
        <div className={s.stack}>
          <Meter label="Exemplo 30%" pct={30} />
          <Meter label="Exemplo 65%" pct={65} />
          <Meter label="Exemplo 90%" pct={90} />
          <Meter label="Exemplo sem dado" />
        </div>
      </Card>
      <Card title="Abas">
        <Tabs
          label="Exemplo"
          items={[
            ["a", "S08 ativa"],
            ["b", "S07 fechada"],
            ["c", "S06 fechada"],
          ]}
          value={tab}
          onChange={setTab}
        />
      </Card>
      <Card title="Cartão" aside={<Badge tone="warn">plano</Badge>}>
        <p className={s.muted}>Cabeçalho com título e selo; corpo livre. Borda fina, sem sombra.</p>
      </Card>
      <Card title="Estado vazio">
        <Empty title="Nenhum agente rodando">
          Os agentes aparecem aqui quando a sprint começa.
        </Empty>
      </Card>
      <div className={s.wide}>
        <Card title="Acordeão com tabela">
          <Accordion title="Tarefas de exemplo" aside={<small className={s.num}>1/4</small>} open>
            <TaskTable tasks={sample} />
          </Accordion>
          <Accordion title="Fechado por padrão">
            <p className={s.muted}>Conteúdo secundário.</p>
          </Accordion>
        </Card>
      </div>
    </div>
  );
}
