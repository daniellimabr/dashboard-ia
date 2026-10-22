import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { parseBacklog, parseRoadmap, sprintDoc } from "./docsParse";

const BACKLOG = `# Backlog

Formato: \`- [prioridade] data [status: SNN] — texto\`.

## Itens

- [alta] 2026-10-21 [concluído: S05] — Navegação pelos projetos.
- [alta] 2026-10-22 [planejado: S07] — Telas dos drafts:
  - **Sala:** variante B.
  - **Chats:** lista.

- [média] 2026-10-16 — Link para o VS Code.

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
  it("reads priority, date, status, sprint, text and subitems, open items first", () => {
    const items = parseBacklog(BACKLOG);
    expect(items.map((i) => i.status)).toEqual(["open", "planned", "done"]);
    expect(items[0]).toEqual({
      priority: "média",
      date: "2026-10-16",
      status: "open",
      sprint: undefined,
      text: "Link para o VS Code.",
      sub: [],
    });
    expect(items[2]).toMatchObject({ status: "done", sprint: "S05" });
    expect(items[1]).toMatchObject({
      status: "planned",
      sprint: "S07",
      text: "Telas dos drafts:",
      sub: ["**Sala:** variante B.", "**Chats:** lista."],
    });
  });

  it("accepts the old bold-priority format without date", () => {
    expect(parseBacklog("- **[alta]** Servidor local.")[0]).toMatchObject({
      priority: "alta",
      date: undefined,
      status: "open",
      text: "Servidor local.",
    });
  });

  it("returns no items for a file outside the format", () => {
    expect(parseBacklog("# Backlog\n\nTexto livre.\n- item solto")).toEqual([]);
  });
});

describe("parseRoadmap", () => {
  it("returns the four columns in order, with the sprints each item cites", () => {
    const cols = parseRoadmap(ROADMAP);
    expect(cols?.map((c) => c.name)).toEqual(["Agora", "Próximo", "Depois", "Feito"]);
    expect(cols?.[2]?.items).toEqual([]);
    expect(cols?.[3]?.items[0]).toEqual({
      text: "S01–S03 — Draft e servidor.",
      sprints: ["S01", "S02", "S03"],
    });
    expect(cols?.[1]?.items).toEqual([
      { text: "S05 — Navegação.", sprints: ["S05"] },
      { text: "Agentes com precisão.", sprints: [] },
    ]);
  });

  it("returns null when no known section exists", () => {
    expect(parseRoadmap("# Roadmap\n\n## Visão\n\n- algo")).toBeNull();
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
