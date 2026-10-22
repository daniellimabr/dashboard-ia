import { useState, type JSX } from "react";
import type { Project } from "../../data/types";
import { STEPS } from "../../data/types";
import { formatUsd } from "../../lib/format";
import { splitIdle } from "../../lib/idle";
import { sprintPct, taskStatus } from "../../lib/progress";
import { durationMs, formatDuration, formatTime, formatWeekday } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./c.module.css";
import {
  IdleList,
  IdleScreen,
  looseChats,
  ProjectScreen,
  promotedOf,
  recentSprints,
  sprintState,
  TimelineScreen,
  type Tab,
} from "./pages";
import pg from "./pages.module.css";
import { ComponentSheet, ControlRoom, SprintList } from "./screens";
import { mainSprint, Meter, Panel, Pill } from "./ui";

export type Screen = "home" | "components" | "control" | "sprints";
type View = Screen | "timeline" | "idle" | "project";

const SCREENS: [View, string][] = [
  ["home", "Início"],
  ["control", "Sala de controle"],
  ["timeline", "Linha do tempo"],
  ["idle", "Ociosos"],
  ["components", "Componentes"],
];
const ITEMS: [Tab | "sprints", string][] = [
  ["chats", "Chats"],
  ["sprints", "Sprints"],
  ["backlog", "Backlog"],
  ["roadmap", "Roadmap"],
  ["docs", "Documentos"],
];

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
  const { data } = useData();
  const now = useNow();
  const { active, idle } = splitIdle(data.projects, now, promotedOf(data));
  const ordered = [...active].sort(
    (a, b) => Number(b.id === projectId) - Number(a.id === projectId),
  );
  const waiting = active.filter((p) => p.alerts?.length).length;
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
          <IdleList />
        </Panel>
      </div>
    </>
  );
}

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
  const [expanded, setExpanded] = useState(projectId);
  const [dark, setDark] = useState(false);
  // Extra screens live here; the frame only knows `screen`, so a new `screen` resets the view.
  const [view, setView] = useState<View>(screen);
  const [seen, setSeen] = useState(screen);
  if (screen !== seen) {
    setSeen(screen);
    setView(screen);
  }
  const [tab, setTab] = useState<Tab>("chats");
  const project = data.projects.find((p) => p.id === projectId);
  const { h5, week } = data.limits;
  const go = (v: View) => {
    setView(v);
    if (v === "home" || v === "control" || v === "sprints" || v === "components") onScreen(v);
  };
  const open = (id: string) => {
    setProjectId(id);
    go("sprints");
  };
  const openTab = (id: string, t: Tab) => {
    setProjectId(id);
    setTab(t);
    setView("project");
  };

  const projectButton = (p: Project) => {
    const sprint = mainSprint(data, p.id);
    const isOpen = expanded === p.id;
    const loose = looseChats(data, p.id);
    return (
      <li key={p.id}>
        <button
          type="button"
          className={s.proj}
          aria-current={p.id === projectId || undefined}
          aria-expanded={isOpen}
          onClick={() => {
            setProjectId(p.id);
            setExpanded(isOpen ? "" : p.id);
          }}
        >
          <i className={s.dot} data-tone={p.phase?.tone} data-live={p.phase?.live || undefined} />
          <span>{p.name}</span>
          <small>
            {sprint?.status === "active" ? `${sprint.id} · ${sprintPct(sprint.tasks)}%` : ""}
          </small>
          {!!p.alerts?.length && <b className={s.badge}>{p.alerts.length}</b>}
        </button>
        {isOpen && (
          <div className={pg.acc}>
            <span className={pg.accK}>Sprints recentes</span>
            <ul aria-label={`Sprints de ${p.name}`}>
              {recentSprints(data, p.id).map((x) => {
                const [label, tone, live] = sprintState(x);
                return (
                  <li key={x.id}>
                    <button type="button" title={x.title} onClick={() => open(p.id)}>
                      <span>
                        {x.id} {x.title}
                      </span>
                      <Pill tone={tone} live={live}>
                        {label}
                      </Pill>
                    </button>
                  </li>
                );
              })}
            </ul>
            {loose.length > 0 && (
              <>
                <span className={pg.accK}>Chats sem sprint</span>
                <ul aria-label={`Chats sem sprint de ${p.name}`}>
                  {loose.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => openTab(p.id, "chats")}>
                        <span>{c.title}</span>
                        <Pill tone={c.endedAt ? undefined : "run"} live={!c.endedAt}>
                          {c.endedAt ? "encerrado" : "aberto"}
                        </Pill>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </li>
    );
  };
  const idleCount = splitIdle(data.projects, now, promotedOf(data)).idle.length;

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
              aria-current={id === view ? "page" : undefined}
              onClick={() => go(id)}
            >
              {id === "idle" ? `${label} (${idleCount})` : label}
            </button>
          ))}
        </nav>
        {project && (
          <nav aria-label="Itens" className={s.screens}>
            <span className={s.sideK}>Itens de {project.name}</span>
            {ITEMS.map(([t, label]) => {
              const on = t === "sprints" ? view === "sprints" : view === "project" && tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-current={on ? "page" : undefined}
                  onClick={() => (t === "sprints" ? go("sprints") : openTab(project.id, t))}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        )}
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
        {view === "home" && <Home projectId={projectId} onOpen={open} />}
        {view === "control" && project && <ControlRoom project={project} />}
        {view === "sprints" && project && <SprintList project={project} />}
        {view === "components" && <ComponentSheet />}
        {view === "timeline" && <TimelineScreen />}
        {view === "idle" && <IdleScreen />}
        {view === "project" && project && <ProjectScreen project={project} tab={tab} />}
        <footer className={s.foot}>
          <p>
            <b>Ideia:</b> um espaço de trabalho. Os projetos ficam sempre à vista no menu lateral, e
            o conteúdo se organiza em painéis; o projeto escolhido ganha o painel largo.
          </p>
          <p>
            <b>Navegação:</b> sem abas no topo, tudo pelo menu lateral, em três blocos. Telas
            (Início, Sala de controle, Linha do tempo, Ociosos); Itens do projeto selecionado
            (Chats, Sprints, Backlog, Roadmap, Documentos); e Projetos: clicar num projeto o
            seleciona e abre um acordeão com as 5 sprints mais recentes e o status de cada uma, mais
            os chats ainda sem sprint (viram sprint quando têm sprint plan).
          </p>
          <p>
            <b>Custo na S09:</b> médio. Trocar o Layout por menu lateral com Itens e acordeão de
            projeto e levar projeto e item para a rota; Linha do tempo, Ociosos e os itens do
            projeto viram painéis com os dados que já existem (~4 tarefas de tela).
          </p>
          <p>
            <b>Dados que a S09 precisa:</b> evento de espera por resposta de Daniel; evento de
            espera de limite de sessão; custo e tokens por agente; estado do agente vindo do
            harness; id do agente na tarefa; tarefas tocadas por agente.
          </p>
        </footer>
      </main>
    </div>
  );
}
