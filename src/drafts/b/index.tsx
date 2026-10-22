import { useState, type ReactNode } from "react";
import {
  STEPS,
  type Data,
  type Limit,
  type Project,
  type Sprint,
  type Task,
} from "../../data/types";
import { formatUsd } from "../../lib/format";
import { splitIdle } from "../../lib/idle";
import { agentLabel, currentWave, sprintPct, taskStatus } from "../../lib/progress";
import { activeSprint, runningAgents } from "../../lib/select";
import { durationMs, formatDate, formatDuration, formatTime, formatWeekday } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./b.module.css";
import { Accordion, Badge, Button, Card, Empty, Meter, Table, Tabs, meterTone } from "./ui";

export type Screen = "home" | "components" | "control" | "sprints";

const MENU: [Screen, string][] = [
  ["home", "Início"],
  ["control", "Sala de controle"],
  ["sprints", "Sprints"],
  ["components", "Componentes"],
];
const DAY = 86_400_000;
const MIN = 60_000;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The sprint a screen talks about: active, else planned, else the latest. */
const mainSprint = (data: Data, projectId: string): Sprint | undefined =>
  activeSprint(data, projectId) ??
  data.sprints.find((x) => x.projectId === projectId && x.status === "planned") ??
  data.sprints.filter((x) => x.projectId === projectId).at(-1);

const currentTask = (tasks: Task[]) =>
  tasks.find((t) => taskStatus(t) === "failed") ?? tasks.find((t) => taskStatus(t) === "running");

// usage dates are UTC days, like toISOString
const spentToday = (data: Data, projectId: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return data.usage
    .filter((u) => u.projectId === projectId && u.date === today)
    .reduce((sum, u) => sum + u.usd, 0);
};

const STATUS = {
  done: ["Feita", "ok"],
  failed: ["Reprovada", "bad"],
  running: ["Em andamento", "run"],
  todo: ["A fazer", undefined],
} as const;

const SPRINT_STATUS = {
  active: ["Em execução", "run"],
  planned: ["Planejada", "warn"],
  closed: ["Concluída", "ok"],
} as const;

function StatusBadge({ t }: { t: Task }) {
  const [label, tone] = STATUS[taskStatus(t)];
  return <Badge tone={tone}>{label}</Badge>;
}

function Steps({ t }: { t: Task }) {
  const st = taskStatus(t);
  const n = t.done ? STEPS.length : (t.steps ?? 0);
  const mark = (i: number) =>
    i < n
      ? "done"
      : i === n && st === "running"
        ? "run"
        : i === n && st === "failed"
          ? "bad"
          : undefined;
  return (
    <div>
      <div className={s.steps} aria-hidden="true">
        {STEPS.map((x, i) => (
          <i key={x} data-s={mark(i)} />
        ))}
      </div>
      <span className={s.small}>
        {t.done
          ? "Commit feito"
          : st === "todo"
            ? "Não começou"
            : STEPS[Math.min(n, STEPS.length - 1)]}
      </span>
    </div>
  );
}

function TaskTable({ tasks, now }: { tasks: Task[]; now: number }) {
  return (
    <Table
      head={["Tarefa", "Estado", "Etapas", "Tempo"]}
      rows={tasks.map((t) => [
        <>
          <strong>{t.id}</strong> {t.title}
          {t.agent && (
            <div className={s.small}>
              {agentLabel(t.agent)}
              {t.wave ? `, onda ${t.wave}` : ""}
            </div>
          )}
        </>,
        <StatusBadge t={t} />,
        <Steps t={t} />,
        t.startedAt ? formatDuration(durationMs(t.startedAt, t.endedAt, now)) : "não começou",
      ])}
    />
  );
}

function LimitView({ label, limit, note }: { label: string; limit?: Limit; note: string }) {
  return (
    <div className={s.limit}>
      <span className={s.limitPct}>{limit ? `${limit.pct}%` : "sem dado"}</span>
      <span className={s.limitText}>
        {label}, {note}
      </span>
      <Meter label={label} pct={limit?.pct} tone={limit ? meterTone(limit.pct) : undefined} />
    </div>
  );
}

function Limits({ data, now }: { data: Data; now: number }) {
  const { h5, week } = data.limits;
  return (
    <div className={`${s.wrap} ${s.limits}`}>
      <LimitView
        label="Limite 5 h"
        limit={h5}
        note={
          h5.estimated || !h5.resetsAt
            ? "estimado pelo gasto"
            : `renova em ${formatDuration(durationMs(new Date(now).toISOString(), h5.resetsAt))}`
        }
      />
      <LimitView
        label="Semanal"
        limit={week}
        note={
          week?.resetsAt
            ? `renova ${formatWeekday(week.resetsAt)} às ${formatTime(week.resetsAt)}`
            : "sem dado"
        }
      />
    </div>
  );
}

function Fact({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className={s.fact}>
      <span className={s.factLabel}>{label}</span>
      {children}
    </div>
  );
}

function ProjectRow({ p, data, onOpen }: { p: Project; data: Data; onOpen: (id: string) => void }) {
  const sprint = mainSprint(data, p.id);
  const task = currentTask(sprint?.tasks ?? []);
  const chats = data.chats.filter((c) => c.projectId === p.id && !c.endedAt);
  return (
    <section className={s.project} aria-label={p.name}>
      <div className={s.stack}>
        <h2 className={s.h2}>
          <button type="button" className={s.projectName} onClick={() => onOpen(p.id)}>
            {p.name}
          </button>
        </h2>
        {p.phase && (
          <Badge tone={p.phase.tone} live={p.phase.live}>
            {p.phase.label}
          </Badge>
        )}
        {p.alerts?.length ? (
          <ul className={s.alerts}>
            {p.alerts.map((a) => (
              <li key={a.title} className={s.alert} data-tone={a.tone}>
                <strong>{a.title}</strong>
                <div className={s.small}>{a.detail}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.small}>Nada esperando você.</p>
        )}
      </div>
      <div className={s.stack}>
        <Fact label="Sprint">
          <span className={s.factValue}>
            {sprint ? (
              <>
                <strong>{sprint.id}</strong> {sprint.title}
              </>
            ) : (
              "Sem sprint"
            )}
          </span>
        </Fact>
        <Fact label={task ? "Tarefa atual" : "Sem tarefa em andamento"}>
          {task && (
            <>
              <span className={s.factValue}>
                {task.id} {task.title}
              </span>
              <span className={s.small}>
                Etapa {STEPS[Math.min(task.steps ?? 0, STEPS.length - 1)]}
                {taskStatus(task) === "failed" ? ", reprovada na revisão" : ""}
              </span>
            </>
          )}
        </Fact>
        <Fact
          label={
            chats.length
              ? plural(chats.length, "chat aberto", "chats abertos")
              : "Nenhum chat aberto"
          }
        >
          {chats.length > 0 && (
            <ul className={s.plain}>
              {chats.map((c) => (
                <li key={c.id}>
                  {c.title} <span className={s.small}>desde {formatTime(c.startedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Fact>
      </div>
      <div className={s.stack}>
        <span className={s.bigPct}>{sprint ? `${sprintPct(sprint.tasks)}%` : "0%"}</span>
        <span className={s.small}>da sprint concluída</span>
        {sprint?.usd !== undefined && (
          <span className={s.factValue}>{formatUsd(sprint.usd)} na sprint</span>
        )}
        <span className={s.small}>{formatUsd(spentToday(data, p.id))} gastos hoje</span>
      </div>
    </section>
  );
}

function Home({
  data,
  active,
  idle,
  now,
  onOpen,
}: {
  data: Data;
  active: Project[];
  idle: Project[];
  now: number;
  onOpen: (id: string) => void;
}) {
  const { refresh } = useData();
  const waiting = active.filter((p) => p.alerts?.length).length;
  const promote = (id: string) =>
    void fetch(`/api/projects/${encodeURIComponent(id)}/promote`, { method: "POST" })
      .catch(() => {}) // offline: the next poll shows the real state
      .then(refresh);
  return (
    <>
      <h1 className={s.display}>
        {plural(active.length, "projeto ativo", "projetos ativos")} hoje.
      </h1>
      <p className={s.lede}>
        {waiting
          ? `${plural(waiting, "projeto espera", "projetos esperam")} algo de você.`
          : "Nenhum projeto espera por você agora."}{" "}
        Seu último comando foi às {formatTime(data.lastCommand.at)}.
      </p>
      <div className={s.projects}>
        {active.map((p) => (
          <ProjectRow key={p.id} p={p} data={data} onOpen={onOpen} />
        ))}
      </div>
      <section className={s.idle} aria-label="Ociosos">
        <h2 className={s.h3}>Ociosos ({idle.length})</h2>
        <p className={s.small}>
          Sem atividade há mais de 7 dias, ou além dos 3 mais ativos. Traga de volta com um clique.
        </p>
        {idle.length === 0 && <p className={s.small}>Nenhum projeto ocioso.</p>}
        {idle.map((p) => {
          const days = Math.floor((now - Date.parse(p.lastActivityAt)) / DAY);
          const last = data.sprints.filter((x) => x.projectId === p.id).at(-1);
          return (
            <div key={p.id} className={s.idleRow}>
              <div>
                <strong>{p.name}</strong>
                <div className={s.small}>
                  {last
                    ? `${last.id} ${last.status === "closed" ? "fechada" : "aberta"}`
                    : "sem sprint"}
                  , parado há {plural(days, "dia", "dias")}
                </div>
              </div>
              <Button onClick={() => promote(p.id)}>Trazer para ativos</Button>
            </div>
          );
        })}
      </section>
    </>
  );
}

const noProject = (
  <Empty title="Nenhum projeto" text="Conecte um projeto ao Main Harness para ele aparecer aqui." />
);

function Control({ data, project, now }: { data: Data; project?: Project; now: number }) {
  const sprint = project && mainSprint(data, project.id);
  const tasks = sprint?.tasks ?? [];
  const agents = project ? runningAgents(data, project.id) : [];
  const adhoc = data.chats
    .filter((c) => c.projectId === project?.id && !c.sprintId)
    .flatMap((c) => c.tasks.map((t) => ({ t, chat: c.title })));
  const start = sprint?.startedAt;
  const runMs = start ? durationMs(start, sprint?.deliveredAt, now) : 0;
  const plan = sprint?.plannedMin ?? 0;
  const timePct = plan ? Math.round((runMs / (plan * MIN)) * 100) : undefined;
  const done = tasks.filter((t) => t.done).length;
  const wave = currentWave(tasks);
  return (
    <>
      <h1 className={s.display}>Sala de controle</h1>
      {!project ? (
        noProject
      ) : (
        <>
          <p className={s.lede}>
            {sprint
              ? `${project.name}, ${sprint.id}: ${sprint.title}`
              : `${project.name} ainda não tem sprint.`}
          </p>
          {project.phase && (
            <p style={{ marginTop: 16 }}>
              <Badge tone={project.phase.tone} live={project.phase.live}>
                {project.phase.label}
              </Badge>
            </p>
          )}
          {sprint && (
            <div className={s.headline}>
              <span className={s.bigPct}>{sprintPct(tasks)}%</span>
              <div className={s.gauges}>
                <Fact label="Tempo">
                  <span className={s.factValue}>
                    {start ? `${formatDuration(runMs)} de ${plan} min previstos` : "não começou"}
                  </span>
                  <Meter
                    label="Tempo"
                    pct={timePct}
                    tone={timePct !== undefined && timePct > 100 ? "bad" : "run"}
                  />
                </Fact>
                <Fact label="Tarefas">
                  <span className={s.factValue}>
                    {done} de {tasks.length} feitas
                  </span>
                  <Meter
                    label="Tarefas"
                    pct={tasks.length ? Math.round((done / tasks.length) * 100) : 0}
                  />
                </Fact>
                <Fact label="Onda">
                  <span className={s.factValue}>
                    {wave.total ? `${wave.current} de ${wave.total}` : "sem ondas"}
                  </span>
                  <Meter
                    label="Onda"
                    pct={wave.total ? Math.round((wave.current / wave.total) * 100) : 0}
                  />
                </Fact>
              </div>
            </div>
          )}
          <section className={s.section}>
            <h2 className={s.h3}>Agentes agora</h2>
            {agents.length ? (
              <div className={s.row}>
                {agents.map((a) => (
                  <Badge key={a.id} tone="run" live>
                    {agentLabel(a.kind, a.name)} {a.name}
                    {a.task ? `, ${a.task}` : ""}
                    {a.doing ? `: ${a.doing}` : ""}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className={s.small}>Nenhum agente rodando.</p>
            )}
          </section>
          <section className={s.section}>
            <h2 className={s.h3}>Tarefas da sprint</h2>
            {tasks.length ? (
              <TaskTable tasks={tasks} now={now} />
            ) : (
              <Empty title="Sem tarefas" text="O plano desta sprint ainda não tem tarefas." />
            )}
          </section>
          {adhoc.length > 0 && (
            <section className={s.section}>
              <h2 className={s.h3}>Fora da sprint</h2>
              <Table
                head={["Tarefa", "Chat", "Estado"]}
                rows={adhoc.map(({ t, chat }) => [
                  `${t.id} ${t.title}`,
                  chat,
                  <StatusBadge t={t} />,
                ])}
              />
            </section>
          )}
        </>
      )}
    </>
  );
}

const PROJECT_TABS = [
  { id: "chats", label: "Chats", disabled: true },
  { id: "sprints", label: "Sprints" },
  { id: "plan", label: "Backlog e Roadmap", disabled: true },
  { id: "docs", label: "Documentos", disabled: true },
  { id: "usage", label: "Consumo", disabled: true },
];

function Sprints({ data, project, now }: { data: Data; project?: Project; now: number }) {
  const sprints = data.sprints
    .filter((x) => x.projectId === project?.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  return (
    <>
      <h1 className={s.display}>{project ? `${project.name} › Sprints` : "Sprints"}</h1>
      {!project ? (
        noProject
      ) : (
        <div className={s.section}>
          <Tabs label="Seções do projeto" items={PROJECT_TABS} value="sprints" />
          {sprints.length === 0 && (
            <Empty
              title="Nenhuma sprint ainda"
              text="Quando o primeiro sprint plan for aprovado, ele aparece aqui."
            />
          )}
          {sprints.map((sp) => {
            const [label, tone] = SPRINT_STATUS[sp.status];
            const done = sp.tasks.filter((t) => t.done).length;
            const pct = sprintPct(sp.tasks);
            return (
              <Accordion
                key={sp.id}
                open={sp.status === "active"}
                summary={
                  <div className={s.stack}>
                    <span className={s.h3}>
                      {sp.id} {sp.title}
                    </span>
                    <span className={s.row}>
                      <Badge tone={tone}>{label}</Badge>
                      <span className={s.small}>
                        {done} de {sp.tasks.length} tarefas, {pct}%
                      </span>
                      <span className={s.small}>
                        {sp.startedAt
                          ? `${formatDate(sp.startedAt)} a ${sp.closedAt ? formatDate(sp.closedAt) : "hoje"}`
                          : "não iniciada"}
                      </span>
                      {sp.usd !== undefined && <span className={s.small}>{formatUsd(sp.usd)}</span>}
                    </span>
                    <Meter label={`Progresso da ${sp.id}`} pct={pct} tone="run" />
                  </div>
                }
              >
                {sp.goal && <p style={{ marginBottom: 24, maxWidth: "60ch" }}>{sp.goal}</p>}
                <TaskTable tasks={sp.tasks} now={now} />
              </Accordion>
            );
          })}
        </div>
      )}
    </>
  );
}

const Spec = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className={s.stack}>
    <h2 className={s.h3}>{title}</h2>
    {children}
  </section>
);

function Sheet({ data, now }: { data: Data; now: number }) {
  const [tab, setTab] = useState<"chats" | "sprints" | "usage">("sprints");
  const sample = data.sprints.find((x) => x.status === "active") ?? data.sprints[0];
  const next = data.projects.find((p) => p.nextStep)?.nextStep;
  return (
    <>
      <h1 className={s.display}>Folha de componentes</h1>
      <p className={s.lede}>
        As peças que montam todas as telas desta direção, com os dados do painel.
      </p>
      <div className={s.sheet}>
        <Spec title="Botão">
          <div className={s.row}>
            <Button kind="primary">Aprovar plano</Button>
            <Button>Abrir sprint</Button>
            <Button kind="quiet">Cancelar</Button>
          </div>
        </Spec>
        <Spec title="Selo de estado">
          <div className={s.row}>
            <Badge tone="run" live>
              Execução
            </Badge>
            <Badge tone="warn">Esperando você</Badge>
            <Badge tone="bad">Reprovada</Badge>
            <Badge tone="ok">Concluída</Badge>
            <Badge>A fazer</Badge>
          </div>
        </Spec>
        <Spec title="Cartão">
          <Card>
            <h3 className={s.h3}>{next?.title ?? "Nada para você agora"}</h3>
            <p className={s.small}>{next?.detail ?? "Os agentes seguem sozinhos."}</p>
          </Card>
        </Spec>
        <Spec title="Medidor">
          <Fact label="Normal, 35%">
            <Meter label="Normal" pct={35} />
          </Fact>
          <Fact label="Atenção, 68%">
            <Meter label="Atenção" pct={68} tone={meterTone(68)} />
          </Fact>
          <Fact label="Perto do limite, 92%">
            <Meter label="Perto do limite" pct={92} tone={meterTone(92)} />
          </Fact>
        </Spec>
        <Spec title="Abas">
          <Tabs
            label="Exemplo de abas"
            value={tab}
            onChange={setTab}
            items={[
              { id: "chats", label: "Chats" },
              { id: "sprints", label: "Sprints" },
              { id: "usage", label: "Consumo" },
            ]}
          />
        </Spec>
        <Spec title="Estado vazio">
          <Empty
            title="Nenhum chat aberto"
            text="Abra um chat no projeto para começar uma tarefa."
            action={<Button kind="primary">Abrir chat</Button>}
          />
        </Spec>
      </div>
      {sample && (
        <>
          <section className={s.section}>
            <h2 className={s.h3}>Acordeão</h2>
            <Accordion summary={<span className={s.h3}>{`${sample.id} ${sample.title}`}</span>}>
              <p>{sample.goal ?? "Sem objetivo registrado."}</p>
            </Accordion>
          </section>
          <section className={s.section}>
            <h2 className={s.h3}>Tabela</h2>
            <TaskTable tasks={sample.tasks} now={now} />
          </section>
        </>
      )}
    </>
  );
}

const Footer = () => (
  <footer className={s.foot}>
    <div className={s.wrap}>
      <p>
        <strong>Direção B, Editorial limpo.</strong> Fundo claro, uma fonte só e hierarquia por
        tamanho e peso: o que mais importa é o maior número da tela.
      </p>
      <p>
        Navegação: menu de texto no topo com quatro destinos. Bem-vindo e Ociosos viram uma tela só
        (Início); a Sala de controle mostra um projeto por vez, escolhido no seletor.
      </p>
      <p>
        Custo na S09: médio. Trocar os tokens e a moldura, reescrever Início e Sala de controle; as
        abas do projeto só mudam de estilo.
      </p>
    </div>
  </footer>
);

export function Draft({ screen, onScreen }: { screen: Screen; onScreen: (s: Screen) => void }) {
  const { data, offlineSince } = useData();
  const now = useNow();
  const [dark, setDark] = useState(false);
  const promoted = new Set(data.projects.filter((p) => p.promoted).map((p) => p.id));
  const { active, idle } = splitIdle(data.projects, now, promoted);
  const [projectId, setProjectId] = useState(active[0]?.id ?? data.projects[0]?.id);
  const project = data.projects.find((p) => p.id === projectId) ?? data.projects[0];
  const open = (id: string) => {
    setProjectId(id);
    onScreen("control");
  };
  return (
    <div className={s.root} data-theme={dark ? "dark" : "light"}>
      <header className={s.mast}>
        <div className={`${s.wrap} ${s.mastRow}`}>
          <span className={s.brand}>Painel IA</span>
          <nav className={s.nav} aria-label="Telas">
            {MENU.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={s.navLink}
                aria-current={id === screen ? "page" : undefined}
                onClick={() => onScreen(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className={s.mastEnd}>
            <select
              className={s.select}
              aria-label="Projeto"
              value={project?.id}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {[...active, ...idle].map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button kind="quiet" onClick={() => setDark(!dark)}>
              {dark ? "Modo claro" : "Modo escuro"}
            </Button>
          </div>
        </div>
        <Limits data={data} now={now} />
      </header>
      {offlineSince !== undefined && (
        <div className={s.offline} role="status">
          <div className={s.wrap}>
            Sem conexão desde {formatTime(new Date(offlineSince).toISOString())}. Os números são da
            última leitura; o painel tenta de novo a cada 5 s.
          </div>
        </div>
      )}
      <main className={`${s.wrap} ${s.main}`}>
        {screen === "home" && (
          <Home data={data} active={active} idle={idle} now={now} onOpen={open} />
        )}
        {screen === "control" && <Control data={data} project={project} now={now} />}
        {screen === "sprints" && <Sprints data={data} project={project} now={now} />}
        {screen === "components" && <Sheet data={data} now={now} />}
      </main>
      <Footer />
    </div>
  );
}
