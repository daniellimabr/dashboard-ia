import { useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import type { Limit } from "../data/types";
import { splitIdle } from "../lib/idle";
import { durationMs, formatDuration, formatTime, formatWeekday } from "../lib/time";
import type { Board } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";
import { useMaybeProject } from "../lib/useProject";

const barTone = (pct: number) => (pct >= 80 ? "bad" : pct >= 60 ? "warn" : "");

function LimitBar({ label, limit, reset }: { label: string; limit?: Limit; reset: string }) {
  const pct = limit?.pct ?? 0;
  return (
    <div className="lim">
      <span className="lbl">
        {label} · <span className="num">{limit ? `${pct}%` : "sem dado"}</span>
      </span>
      <div
        className="bar"
        role="meter"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuetext={limit ? undefined : "sem dado"}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i className={barTone(pct)} style={{ width: `${pct}%` }} />
      </div>
      <small className="muted">{reset}</small>
    </div>
  );
}

export function Layout() {
  const now = useNow();
  const { data, offlineSince, refresh } = useData();
  const board = useMemo<Board>(() => {
    const promoted = new Set(data.projects.filter((p) => p.promoted).map((p) => p.id));
    return {
      ...splitIdle(data.projects, now, promoted),
      promote: (id) =>
        void fetch(`/api/projects/${encodeURIComponent(id)}/promote`, { method: "POST" })
          .catch(() => {}) // offline: the next poll shows the real state
          .then(refresh),
    };
  }, [data, now, refresh]);
  const { h5, week } = data.limits;
  const { pathname } = useLocation(); // remounts the Projetos menu closed after navigating
  return (
    <>
      <nav className="nav wrap" aria-label="Telas">
        <span className="brand">Painel IA</span>
        <div className="tabs">
          <NavLink to="/" end>
            Bem-vindo de volta
          </NavLink>
          <NavLink to="/controle">Sala de controle</NavLink>
          <NavLink to="/tempo">Linha do tempo</NavLink>
          <NavLink to="/ociosos" className="idle-tab">
            Ociosos ({board.idle.length})
          </NavLink>
          {/* shortcut: plain list to reach the project tabs; real project navigation is in the backlog */}
          <details key={pathname} className="projects">
            <summary>Projetos</summary>
            <div>
              {data.projects.map((p) => (
                <Link key={p.id} to={`/p/${p.id}`}>
                  {p.name}
                </Link>
              ))}
            </div>
          </details>
        </div>
        {offlineSince !== undefined && (
          <span className="offline" role="status">
            sem conexão desde {formatTime(new Date(offlineSince).toISOString())}
          </span>
        )}
        <div className="limits">
          <LimitBar
            label="Limite 5 h"
            limit={h5}
            reset={
              h5.estimated || !h5.resetsAt
                ? "estimado"
                : `renova em ${formatDuration(durationMs(new Date(now).toISOString(), h5.resetsAt))}`
            }
          />
          <LimitBar
            label="Semanal"
            limit={week}
            reset={
              week?.resetsAt
                ? `renova ${formatWeekday(week.resetsAt)} ${formatTime(week.resetsAt)}`
                : ""
            }
          />
        </div>
      </nav>
      <main className="wrap">
        <Outlet context={board} />
      </main>
    </>
  );
}

const tabs = [
  ["chats", "Chats"],
  ["sprints", "Sprints"],
  ["plan", "Backlog e Roadmap"],
  ["docs", "Documentos"],
  ["usage", "Consumo"],
] as const;

export function ProjectLayout() {
  const project = useMaybeProject();
  if (!project) return <h1>Projeto não encontrado</h1>;
  return (
    <>
      <h1>{project.name}</h1>
      <nav className="tabs" aria-label="Seções do projeto">
        {tabs.map(([path, label]) => (
          <NavLink key={path} to={`/p/${project.id}/${path}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
}
