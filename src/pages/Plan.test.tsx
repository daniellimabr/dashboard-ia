import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { Data } from "../data/types";
import { renderAt } from "../test-utils";
import { parseBacklog, parseRoadmap, sprintDoc } from "./Plan";

const BACKLOG = `# Backlog

Formato: \`- [prioridade] data [status: SNN] — texto\`.

## Itens

- [alta] 2026-10-21 [planejado: S07] — Telas dos drafts:
  - **Sala:** variante B.
  - **Chats:** lista.

- [média] 2026-10-16 — Link para o VS Code.
- [alta] 2026-10-18 [concluído: S05] — Navegação pelos projetos.

## Pedidos ao harness

- 2026-10-16 — Registro central (alta) — atendido.
`;

const ROADMAP = `# Roadmap

## Agora

- S04 — Painel real.

## Feito

- S01–S03 — Draft e servidor.

## Próximo

- S05 — Navegação.
- Agentes com precisão.
`;

describe("parseBacklog", () => {
  it("reads priority, date, status, sprint, text and subitems", () => {
    const items = parseBacklog(BACKLOG);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      priority: "alta",
      date: "2026-10-21",
      status: "Planejado",
      sprint: "S07",
      text: "Telas dos drafts:",
      sub: ["**Sala:** variante B.", "**Chats:** lista."],
    });
    expect(items[1]).toMatchObject({ status: "Backlog", sprint: undefined, sub: [] });
    expect(items[2]).toMatchObject({ status: "Concluído", sprint: "S05" });
  });

  it("accepts the old bold-priority format without date", () => {
    expect(parseBacklog("- **[alta]** Servidor local.")[0]).toMatchObject({
      priority: "alta",
      date: undefined,
      status: "Backlog",
      text: "Servidor local.",
    });
  });
});

describe("parseRoadmap", () => {
  it("orders stages Feito, Agora, Próximo, Depois and expands sprint ranges", () => {
    const stages = parseRoadmap(ROADMAP);
    expect(stages.map((s) => s.name)).toEqual(["Feito", "Agora", "Próximo"]);
    expect(stages[0]?.sprints).toEqual(["S01", "S02", "S03"]);
    expect(stages[2]).toEqual({
      name: "Próximo",
      items: ["S05 — Navegação.", "Agentes com precisão."],
      sprints: ["S05"],
    });
  });
});

describe("sprintDoc", () => {
  const docs = data.docs.map((d) => ({ ...d, id: `dashboard-ia:docs/sprints/${d.id}.md` }));
  const sprints = data.sprints.filter((s) => s.projectId === "dashboard-ia");
  it("links the Release Report when the sprint is 100%", () => {
    expect(sprintDoc("S01", sprints, docs)?.kind).toBe("release-report");
  });
  it("links the plan otherwise", () => {
    expect(sprintDoc("S02", sprints, docs)?.kind).toBe("sprint-plan");
  });
  it("has no link for an unknown sprint", () => {
    expect(sprintDoc("S99", sprints, docs)).toBeUndefined();
  });
});

describe("Plan page", () => {
  const withMd = (): Data => ({
    ...data,
    projects: data.projects.map((p) =>
      p.id === "dashboard-ia" ? { ...p, backlog: BACKLOG, roadmap: ROADMAP } : p,
    ),
  });

  it("shows the backlog table and kanban, filtered by status", () => {
    renderAt("/p/dashboard-ia/plan", withMd());
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    const kanban = screen.getByRole("region", { name: "Kanban" });
    expect(within(kanban).getByRole("heading", { name: /Concluído/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "Backlog" } });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(kanban).queryByRole("heading", { name: /Concluído/ })).toBeNull();
  });

  it("opens a roadmap stage with links to its sprints", () => {
    renderAt("/p/dashboard-ia/plan", withMd());
    fireEvent.click(screen.getByRole("button", { name: /Feito/ }));
    expect(screen.getByRole("link", { name: /S01/ }).getAttribute("href")).toBe(
      "/p/dashboard-ia/docs/S01-report",
    );
  });
});
