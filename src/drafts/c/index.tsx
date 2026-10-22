import { useState, type JSX } from "react";
import type { Data, Project } from "../../data/types";
import { STEPS } from "../../data/types";
import { formatUsd } from "../../lib/format";
import { splitIdle } from "../../lib/idle";
import { sprintPct, taskStatus } from "../../lib/progress";
import { durationMs, formatDuration, formatTime, formatWeekday } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./c.module.css";
import { ComponentSheet, ControlRoom, SprintList } from "./screens";
import { Empty, mainSprint, Meter, Panel, Pill } from "./ui";

export type Screen = "home" | "components" | "control" | "sprints";

const DAY = 86_400_000;
const SCREENS: [Screen, string][] = [
  ["home", "Início"],
  ["control", "Sala de controle"],
  ["sprints", "Sprints"],
  ["components", "Componentes"],
];

const daysAgo = (iso: string, now: number) => Math.floor((now - Date.parse(iso)) / DAY);

function ProjectPanel({ p, focus, onOpen }: { p: Project; focus: boolean; onOpen: () => void }) {
  const { data } = useData();
  const sprint = mainSprint(data, p.id);
  const tasks = sprint?.tasks ?? [];
  const current =
    tasks.find((t) => ["running", "failed"].includes(taskStatus(t))) ?? tasks.find((t) => !t.done);
  const pct = sprintPct(tasks);
  const chats = data.chats.filter((c) => c.projectId === p.id && !c.endedAt);
  const today = data.usage.filter((u) => u.projectId === p.id).at(-1);
  return (
    <Panel
      label={p.name}
      wide={focus}
      title={
        <button
          type="button"
          className={s.linkBtn}
          onClick={onOpen}
          aria-label={`Abrir sprints de ${p.name}`}
        >
          {p.name}
        </button>
      }
      aside={
        p.phase && (
          <Pill tone={p.phase.tone} live={p.phase.live}>
            {p.phase.label}
          </Pill>
        )
      }
    >
      <div className={s.cardGrid}>
        <div className={s.sprintBox}>
          <span className={s.k} data-testid="sprint">
            {sprint ? `${sprint.id} · ${sprint.title}` : "Sem sprint"}
          </span>
          <div className={s.bigRow}>
            <strong className={s.big}>{pct}%</strong>
            <span className={s.muted}>
              {tasks.filter((t) => t.done).length} de {tasks.length} tarefas
            </span>
          </div>
          <Meter label={`Progresso de ${p.name}`} pct={pct} tone="run" />
          <p className={s.current} data-testid="current-task">
            {current ? (
              <>
                <b>{current.id}</b> {current.title}
                <span className={s.muted}>
                  {current.review === "fail"
                    ? " · reprovada, em correção"
                    : current.startedAt
                      ? ` · em ${STEPS[current.steps ?? 0] ?? "Commit"}`
                      : " · próxima"}
                </span>
              </>
            ) : (
              <span className={s.muted}>Nenhuma tarefa aberta</span>
            )}
          </p>
        </div>
        <dl className={s.facts}>
          <div>
            <dt>Gasto da sprint</dt>
            <dd>{formatUsd(sprint?.usd ?? 0)}</dd>
          </div>
          <div>
            <dt>Hoje</dt>
            <dd>{formatUsd(today?.usd ?? 0)}</dd>
          </div>
        </dl>
      </div>
      {p.alerts?.map((a) => (
        <div key={a.title} className={s.alert} data-tone={a.tone}>
          <b>{a.title}</b>
          <span>{a.detail}</span>
        </div>
      ))}
      <div className={s.chats}>
        <span className={s.k}>Chats abertos ({chats.length})</span>
        {chats.length ? (
          <ul>
            {chats.map((c) => (
              <li key={c.id}>
                <span>{c.title}</span>
                <span className={s.muted}>
                  {c.agents.filter((a) => !a.endedAt).length} agentes · desde{" "}
                  {formatTime(c.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className={s.muted}>Nenhum chat aberto</span>
        )}
      </div>
    </Panel>
  );
}

function Home({ projectId, onOpen }: { projectId: string; onOpen: (id: string) => void }) {
  const { data, refresh } = useData();
  const now = useNow();
  const { active, idle } = splitIdle(data.projects, now, promotedOf(data));
  const ordered = [...active].sort(
    (a, b) => Number(b.id === projectId) - Number(a.id === projectId),
  );
  const waiting = active.filter((p) => p.alerts?.length).length;
  const promote = (id: string) =>
    void fetch(`/api/projects/${encodeURIComponent(id)}/promote`, { method: "POST" })
      .catch(() => {}) // offline: the next poll shows the real state
      .then(refresh);
  return (
    <>
      <div className={s.pageHead}>
        <h1>Início</h1>
        <p className={s.muted}>
          {waiting
            ? `${waiting} de ${active.length} projetos esperam algo de você.`
            : "Nenhum projeto espera por você agora."}
        </p>
      </div>
      <div className={s.board}>
        {ordered.map((p) => (
          <ProjectPanel key={p.id} p={p} focus={p.id === projectId} onOpen={() => onOpen(p.id)} />
        ))}
        <Panel title={`Ociosos (${idle.length})`} wide>
          {idle.length ? (
            <ul className={s.idleList}>
              {idle.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className={s.muted}>
                    {mainSprint(data, p.id)?.id ?? "sem sprint"} · parado há{" "}
                    {daysAgo(p.lastActivityAt, now)} dias
                  </span>
                  <button
                    type="button"
                    className={s.btn}
                    data-kind="ghost"
                    onClick={() => promote(p.id)}
                  >
                    Trazer para ativos
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Nenhum projeto ocioso">
              Projetos parados há mais de 7 dias aparecem aqui.
            </Empty>
          )}
        </Panel>
      </div>
    </>
  );
}

const promotedOf = (data: Data) =>
  new Set(data.projects.filter((p) => p.promoted).map((p) => p.id));

export function Draft({
  screen,
  onScreen,
}: {
  screen: Screen;
  onScreen: (s: Screen) => void;
}): JSX.Element {
  const { data, offlineSince } = useData();
  const now = useNow();
  const { active, idle } = splitIdle(data.projects, now, promotedOf(data));
  const [projectId, setProjectId] = useState(active[0]?.id ?? data.projects[0]?.id ?? "");
  const [dark, setDark] = useState(false);
  const project = data.projects.find((p) => p.id === projectId);
  const { h5, week } = data.limits;
  const open = (id: string) => {
    setProjectId(id);
    onScreen("sprints");
  };

  const projectButton = (p: Project) => {
    const sprint = mainSprint(data, p.id);
    return (
      <li key={p.id}>
        <button
          type="button"
          className={s.proj}
          aria-current={p.id === projectId || undefined}
          onClick={() => setProjectId(p.id)}
        >
          <i className={s.dot} data-tone={p.phase?.tone} data-live={p.phase?.live || undefined} />
          <span>{p.name}</span>
          <small>
            {sprint?.status === "active" ? `${sprint.id} · ${sprintPct(sprint.tasks)}%` : ""}
          </small>
          {!!p.alerts?.length && <b className={s.badge}>{p.alerts.length}</b>}
        </button>
      </li>
    );
  };

  return (
    <div className={s.root} data-theme={dark ? "dark" : "light"}>
      <aside className={s.side}>
        <div className={s.brand}>
          <span>Painel IA</span>
          <button
            type="button"
            className={s.themeBtn}
            aria-pressed={dark}
            onClick={() => setDark(!dark)}
          >
            {dark ? "Tema claro" : "Tema escuro"}
          </button>
        </div>
        <nav aria-label="Telas" className={s.screens}>
          {SCREENS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={id === screen ? "page" : undefined}
              onClick={() => onScreen(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <nav aria-label="Projetos" className={s.projects}>
          <span className={s.sideK}>Projetos</span>
          <ul>{active.map(projectButton)}</ul>
          {idle.length > 0 && (
            <>
              <span className={s.sideK}>Ociosos</span>
              <ul data-idle>{idle.map(projectButton)}</ul>
            </>
          )}
        </nav>
        <div className={s.limits}>
          <div>
            <span>
              Limite 5 h <b>{h5.pct}%</b>
            </span>
            <Meter label="Limite 5 h" pct={h5.pct} />
            <small>
              {h5.estimated || !h5.resetsAt
                ? "estimado"
                : `renova em ${formatDuration(durationMs(new Date(now).toISOString(), h5.resetsAt))}`}
            </small>
          </div>
          <div>
            <span>
              Semanal <b>{week ? `${week.pct}%` : "sem dado"}</b>
            </span>
            <Meter label="Semanal" pct={week?.pct} />
            <small>
              {week?.resetsAt
                ? `renova ${formatWeekday(week.resetsAt)} ${formatTime(week.resetsAt)}`
                : ""}
            </small>
          </div>
        </div>
      </aside>
      <main className={s.main}>
        {offlineSince !== undefined && (
          <div className={s.offline} role="status">
            Sem conexão com o servidor desde {formatTime(new Date(offlineSince).toISOString())}. Os
            números abaixo são da última leitura.
          </div>
        )}
        {screen === "home" && <Home projectId={projectId} onOpen={open} />}
        {screen === "control" && project && <ControlRoom project={project} />}
        {screen === "sprints" && project && <SprintList project={project} />}
        {screen === "components" && <ComponentSheet />}
        <footer className={s.foot}>
          <p>
            <b>Ideia:</b> um espaço de trabalho. Os projetos ficam sempre à vista no menu lateral, e
            o conteúdo se organiza em painéis; o projeto escolhido ganha o painel largo.
          </p>
          <p>
            <b>Navegação:</b> saem as abas do topo e a tela Ociosos. O menu lateral junta telas,
            projetos (com fase, sprint e % ao lado do nome) e os limites; Sala de controle e Sprints
            mostram o projeto selecionado.
          </p>
          <p>
            <b>Custo na S09:</b> médio. Trocar o Layout por menu lateral e levar o projeto
            selecionado para a rota; as telas viram grades de painéis com os mesmos dados (~3
            tarefas de tela).
          </p>
        </footer>
      </main>
    </div>
  );
}
