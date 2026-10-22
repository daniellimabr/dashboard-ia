import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Chats", () => {
  it("lists the project's chats newest first, with start and last interaction", () => {
    renderAt("/p/dashboard-ia/chats");
    screen.getByRole("columnheader", { name: "Início" });
    screen.getByRole("columnheader", { name: "Última interação" });
    const rows = screen.getAllByRole("row").slice(1) as [HTMLElement, HTMLElement, HTMLElement];
    expect(rows.map((r) => within(r).getByRole("link").textContent)).toEqual([
      "Executar sprint S02",
      "hook lento",
      "Executar sprint S01",
    ]);
    expect(within(rows[0]).getByRole("link").getAttribute("href")).toBe(
      "/p/dashboard-ia/chats/c-dash-2",
    );
    within(rows[0]).getByText("em andamento");
    within(rows[0]).getByText("3 agentes rodando");
    expect(rows[0].className).toMatch(/open/);
    within(rows[1]).getByText("encerrado");
    expect(rows[1].className).not.toMatch(/open/);
    within(rows[1]).getByText("fora da sprint");
    expect(screen.queryByText("Executar sprint S05")).toBeNull();
  });

  it("shows an empty state when the project has no chats", () => {
    renderAt("/p/planilha-orcamento/chats");
    screen.getByText(/Nenhum chat/);
  });

  it("shows detail with sprint link, child agents and tasks", () => {
    renderAt("/p/dashboard-ia/chats/c-dash-2");
    screen.getByRole("heading", { name: "Executar sprint S02" });
    expect(screen.getByRole("link", { name: "Sprint S02" }).getAttribute("href")).toBe(
      "/p/dashboard-ia/sprints/S02",
    );
    screen.getByText("Reviewer");
    screen.getByText("Clone 2");
    expect(screen.getAllByText("rodando").length).toBe(3);
    screen.getByText("Tela Bem-vindo de volta");
  });

  it("shows a chat without sprint normally", () => {
    renderAt("/p/dashboard-ia/chats/c-dash-hook");
    screen.getByRole("heading", { name: "hook lento" });
    expect(screen.queryByRole("link", { name: /^Sprint S/ })).toBeNull();
    screen.getByText("Ajustar hook post-edit (lento no Windows)");
  });

  it("shows a message for an unknown chat", () => {
    renderAt("/p/dashboard-ia/chats/nope");
    screen.getByText("Chat não encontrado.");
  });
});
