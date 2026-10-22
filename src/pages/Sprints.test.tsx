import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

const item = (id: string) => screen.getByText(id, { selector: "b" }).closest("details");

describe("Sprints", () => {
  it("lists sprints newest first with status and progress", () => {
    renderAt("/p/main-harness/sprints");
    screen.getByText("Comando hx run");
    screen.getByText("Registro central de projetos");
    expect(screen.getAllByText("fechada")).toHaveLength(2);
    screen.getByText(/^3\/3/);
  });

  it("opens the active sprint by default", () => {
    renderAt("/p/dashboard-ia/sprints");
    expect(item("S02")?.open).toBe(true);
    expect(item("S01")?.open).toBe(false);
  });

  it("opens the sprint in the URL and links its plan", () => {
    renderAt("/p/dashboard-ia/sprints/S01");
    expect(item("S01")?.open).toBe(true);
    expect(item("S02")?.open).toBe(false);
    const hrefs = screen
      .getAllByRole("link", { name: "Sprint plan" })
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/p/dashboard-ia/docs/S01-plan");
    expect(screen.getAllByText(/Release Report: ainda não existe/).length).toBeGreaterThan(0);
  });

  it("shows an empty state when the project has no sprints", () => {
    renderAt("/p/planilha-orcamento/sprints");
    screen.getByText("Nenhuma sprint ainda");
  });
});
