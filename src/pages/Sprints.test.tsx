import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Sprints", () => {
  it("lists sprints with status, progress and detail link", () => {
    renderAt("/p/main-harness/sprints");
    screen.getByText("Comando hx run");
    screen.getByText("Lista de tarefas com horários");
    expect(screen.getAllByText("fechada")).toHaveLength(2);
    screen.getByText("3/3 tarefas");
    const link = screen.getByRole("link", { name: /S05/ });
    expect(link.getAttribute("href")).toBe("/p/main-harness/sprints/S05");
  });

  it("shows empty message when project has no sprints", () => {
    renderAt("/p/loja-online/sprints");
    screen.getByText("Nenhuma sprint ainda.");
  });

  it("shows sprint detail with progress and task list", () => {
    renderAt("/p/dashboard-ia/sprints/S01");
    screen.getByRole("heading", { name: /S01/ });
    screen.getByText("ativa");
    screen.getByText("2/8 tarefas");
    expect(screen.getAllByRole("checkbox")).toHaveLength(8);
  });

  it("shows message for unknown sprint", () => {
    renderAt("/p/dashboard-ia/sprints/S99");
    screen.getByText("Sprint S99 não encontrada.");
  });
});
