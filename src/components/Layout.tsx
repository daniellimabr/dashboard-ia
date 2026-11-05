import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router";
import type { Data, Project, Sprint, Tone } from "../data/types";
import { splitIdle } from "../lib/idle";
import { sprintPct } from "../lib/progress";
import { resetLabel } from "../lib/limits";
import { formatTime } from "../lib/time";
import type { Board } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";
import { useMaybeProject } from "../lib/useProject";
import s from "./Layout.module.css";
import { mainSprint, Meter, Pill } from "./ui";
import u from "./ui.module.css";

export const SCREENS = [
  ["/", "Início"],
  ["/controle", "Sala de controle"],
  ["/tempo", "Linha do tempo"],
  ["/ociosos", "Ociosos"],
] as const;

export const ITEMS = [
  ["chats", "Chats"],
  ["sprints", "Sprints"],
  ["backlog", "Backlog"],
  ["roadmap", "Roadmap"],
  ["docs", "Documentos"],
  ["usage", "Consumo"],
] as const;

/** Sprint status as Daniel reads it in the menu. */
export function sprintState(x: Sprint): [string, Tone | undefined, boolean?] {
  if (x.status === "closed") return ["Fechada", undefined];
  if (x.deliveredAt) return ["Entregue", "warn"];
  if (x.status === "active") return ["Em execução", "run", true];
  return x.approvedAt ? ["Aprovada", "ok"] : ["Planejada", undefined];
}

const recentSprints = (data: Data, projectId: string) =>
  data.sprints
    .filter((x) => x.projectId === projectId)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
    .slice(0, 5);

/** 5 latest chats not tied to a sprint; once a chat gets a sprint plan it shows up as that sprint. */
const looseChats = (data: Data, projectId: string) =>
  data.chats
    .filter((c) => c.projectId === projectId && !c.sprintId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

// Per-viewer conveniences only: storage may be missing or blocked, so every access is guarded.
const load = (key: string) => {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* blocked storage: the choice lasts until reload */
  }
};

export function Layout() {
  const now = useNow();
  const { data, offlineSince, refresh } = useData();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const inProject = useMatch("/p/:projectId/:item/*");
  const sprintPage = useMatch("/p/:projectId/sprints/:sprintId");
  const [query] = useSearchParams();
  const inControl = pathname === "/controle";
  // The sprint on screen: ?p=&s= in the control room, else the sprint page's own.
  const [curProject, curSprint] = inControl
    ? [query.get("p"), query.get("s")]
    : [sprintPage?.params.projectId, sprintPage?.params.sprintId];
  const [picked, setPicked] = useState(() => load("dash.project"));
  const board = useMemo<Board>(() => {
    const promoted = new Set(data.projects.filter((p) => p.promoted).map((p) => p.id));
    const split = splitIdle(data.projects, now, promoted);
    const id = inProject?.params.projectId ?? picked;
    return {
      ...split,
      project: data.projects.find((p) => p.id === id) ?? split.active[0] ?? data.projects[0],
      promote: (pid) =>
        void fetch(`/api/projects/${encodeURIComponent(pid)}/promote`, { method: "POST" })
          .catch(() => {}) // offline: the next poll shows the real state
          .then(refresh),
    };
  }, [data, now, refresh, inProject?.params.projectId, picked]);
  const { active, idle, project } = board;
  const [expanded, setExpanded] = useState(project?.id);

  const item = inProject && ITEMS.find(([path]) => path === inProject.params.item)?.[1];
  const page = item
    ? `${project?.name ?? ""} › ${item}`
    : SCREENS.find(([path]) => path === pathname)?.[1];
  useEffect(() => {
    document.title = page ? `Dashboard IA: ${page}` : "Dashboard IA";
  }, [page]);

  const pick = (p: Project) => {
    setPicked(p.id);
    save("dash.project", p.id);
    setExpanded(expanded === p.id ? undefined : p.id);
    if (inProject) navigate(`/p/${p.id}/${inProject.params.item ?? "chats"}`);
  };

  const projectItem = (p: Project) => {
    const sprint = mainSprint(data, p.id);
    const open = expanded === p.id;
    const loose = looseChats(data, p.id);
    return (
      <li key={p.id}>
        <button
          type="button"
          className={s.proj}
          aria-current={p.id === project?.id || undefined}
          aria-expanded={open}
          onClick={() => pick(p)}
        >
          <i className={s.dot} data-tone={p.phase?.tone} data-live={p.phase?.live || undefined} />
          <span>{p.name}</span>
          <small>
            {sprint?.status === "active" ? `${sprint.id} · ${sprintPct(sprint.tasks)}%` : ""}
          </small>
          {!!p.alerts?.length && <b className={s.badge}>{p.alerts.length}</b>}
        </button>
        {open && (
          <div className={s.acc}>
            <span className={s.accK}>Sprints recentes</span>
            <ul aria-label={`Sprints de ${p.name}`}>
              {recentSprints(data, p.id).map((x) => {
                const [label, tone, live] = sprintState(x);
                return (
                  <li key={x.id}>
                    <Link
                      to={
                        inControl
                          ? `/controle?p=${encodeURIComponent(p.id)}&s=${encodeURIComponent(x.id)}`
                          : `/p/${p.id}/sprints/${x.id}`
                      }
                      aria-current={(p.id === curProject && x.id === curSprint) || undefined}
                    >
                      <span title={`${x.id} ${x.title}`}>
                        {x.id} {x.title}
                      </span>
                      <Pill tone={tone} live={live}>
                        {label}
                      </Pill>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {loose.length > 0 && (
              <>
                <span className={s.accK}>Chats sem sprint</span>
                <ul aria-label={`Chats sem sprint de ${p.name}`}>
                  {loose.map((c) => (
                    <li key={c.id}>
                      <Link to={`/p/${p.id}/chats/${c.id}`}>
                        <span title={c.title}>{c.title}</span>
                        <Pill tone={c.endedAt ? undefined : "run"} live={!c.endedAt}>
                          {c.endedAt ? "encerrado" : "aberto"}
                        </Pill>
                      </Link>
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

  const { h5, week } = data.limits;
  const h5Reset = resetLabel(h5.resetsAt, now, false);
  const weekReset = resetLabel(week?.resetsAt, now, true);
  return (
    <div className={s.root}>
      <aside className={s.side}>
        <div className={s.sideNav}>
          <div className={s.brand}>Dashboard IA</div>
          <nav aria-label="Telas" className={s.screens}>
            {SCREENS.map(([path, label]) => (
              <NavLink key={path} to={path} end>
                {path === "/ociosos" ? `${label} (${idle.length})` : label}
              </NavLink>
            ))}
          </nav>
          {project && (
            <nav aria-label="Itens do projeto" className={s.screens}>
              <span className={s.sideK}>Itens de {project.name}</span>
              {ITEMS.map(([path, label]) => (
                <NavLink key={path} to={`/p/${project.id}/${path}`}>
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
          <nav aria-label="Projetos" className={s.projects}>
            <span className={s.sideK}>Projetos</span>
            <ul>{active.map(projectItem)}</ul>
            {idle.length > 0 && (
              <>
                <span className={s.sideK}>Ociosos</span>
                <ul data-idle>{idle.map(projectItem)}</ul>
              </>
            )}
          </nav>
        </div>
        <div className={s.limits}>
          <div>
            <span>
              Limite 5 h <b>{h5.pct}%</b>
            </span>
            <Meter label="Limite 5 h" pct={h5.pct} />
            <small>
              {h5.estimated ? "estimado" : h5Reset.countdown} <span>{h5Reset.at}</span>
            </small>
          </div>
          <div>
            <span>
              Semanal <b>{week ? `${week.pct}%` : "sem dado"}</b>
            </span>
            <Meter label="Semanal" pct={week?.pct} />
            <small>
              {week?.estimated ? "estimado" : weekReset.countdown} <span>{weekReset.at}</span>
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
        <Outlet context={board} />
      </main>
    </div>
  );
}

/** Project item pages: checks the project and gives every item the same page head. */
export function ProjectLayout() {
  const project = useMaybeProject();
  const item = useMatch("/p/:projectId/:item/*")?.params.item;
  const board = useOutletContext<Board>();
  if (!project)
    return (
      <div className={u.pageHead}>
        <h1>Projeto não encontrado</h1>
      </div>
    );
  return (
    <>
      <div className={u.pageHead}>
        <h1>
          {project.name} › {ITEMS.find(([path]) => path === item)?.[1] ?? ""}
        </h1>
      </div>
      <Outlet context={board} />
    </>
  );
}
