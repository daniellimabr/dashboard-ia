import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Sprints", () => {
  it("lists sprints as accordion rows with status and progress", () => {
    renderAt("/p/main-harness/sprints");
    screen.getByText("Comando hx run");
    screen.getByText("Registro central de projetos");
    expect(screen.getAllByText("fechada")).toHaveLength(2);
    screen.getByText("3/3 tarefas");
  });

  it("opens the active sprint with its tasks", () => {
    renderAt("/p/dashboard-ia/sprints");
    const active = screen.getByRole("button", { name: /S02/ });
    expect(active.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
  });

  it("links the plan and marks a missing Release Report when opened", () => {
    renderAt("/p/dashboard-ia/sprints");
    fireEvent.click(screen.getByRole("button", { name: /S01/ }));
    const hrefs = screen
      .getAllByRole("link", { name: "Sprint plan" })
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/p/dashboard-ia/docs/S01-plan");
    expect(screen.getAllByText("Release Report: ainda não existe").length).toBeGreaterThan(0);
  });

  it("shows empty message when project has no sprints", () => {
    renderAt("/p/planilha-orcamento/sprints");
    screen.getByText("Nenhuma sprint ainda.");
  });

  it("shows sprint detail with progress and task list", () => {
    renderAt("/p/dashboard-ia/sprints/S02");
    screen.getByRole("heading", { name: /S02/ });
    screen.getByText("ativa");
    screen.getByText("1/7 tarefas");
    expect(screen.getAllByRole("checkbox")).toHaveLength(7);
  });

  it("shows message for unknown sprint", () => {
    renderAt("/p/dashboard-ia/sprints/S99");
    screen.getByText("Sprint S99 não encontrada.");
  });
});
