import { NavLink, Outlet, useParams } from "react-router";
import { data } from "../data/mock";
import { findProject } from "../lib/useProject";

export function Layout() {
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          Dashboard IA
        </NavLink>
        <nav className="nav" aria-label="Projetos">
          <NavLink to="/" end>
            Visão geral
          </NavLink>
          {data.projects.map((p) => (
            <NavLink key={p.id} to={`/p/${p.id}`}>
              {p.name}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page">
        <Outlet />
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
  const project = findProject(useParams().projectId);
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
