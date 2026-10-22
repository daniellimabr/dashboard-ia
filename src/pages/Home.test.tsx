import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Home (Início)", () => {
  it("shows, per project, sprint, task, phase, %, spend, alerts and the idle panel", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Início");
    const p = within(screen.getByRole("region", { name: "Dashboard IA" }));
    expect(p.getByTestId("sprint").textContent).toContain("S02");
    expect(p.getByText("Execução")).toBeTruthy();
    expect(p.getAllByText(/\d+%/).length).toBeGreaterThan(0);
    expect(p.getAllByText(/US\$/).length).toBeGreaterThan(0);
    expect(p.getByText("Reviewer reprovou T02")).toBeTruthy();
    expect(p.getByTestId("current-task").textContent).toMatch(/T\d\d/);
    expect(
      p.getByRole("link", { name: "Abrir sprints de Dashboard IA" }).getAttribute("href"),
    ).toBe("/p/dashboard-ia/sprints");
    const idle = within(screen.getByRole("region", { name: /Ociosos/ }));
    expect(idle.getByText("Bot Telegram")).toBeTruthy();
  });

  it("the project in focus gets the wide panel, first", () => {
    renderAt("/");
    const panels = screen
      .getAllByRole("region")
      .filter((r) => r.querySelector("[data-testid=sprint]"));
    expect(panels[0]?.getAttribute("aria-label")).toBe("Dashboard IA");
    expect(panels[0]?.dataset.wide).toBe("true");
  });
});
