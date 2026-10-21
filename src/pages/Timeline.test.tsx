import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

const lane = (name: string) =>
  screen.getByRole("link", { name }).closest("[data-project]")?.nextElementSibling as HTMLElement;
const axis = () => screen.getByTestId("axis").textContent;

describe("Timeline", () => {
  it("draws one bar per agent; out-of-sprint chats are dashed", () => {
    renderAt("/tempo");
    const dash = lane("Dashboard IA");
    expect(dash.textContent).toContain("Tech Lead · fora da sprint");
    expect(dash.textContent).toContain("Reviewer");
    const bars = dash.querySelectorAll("[data-agent]");
    expect(bars).toHaveLength(5);
    const adhoc = dash.querySelector('[data-agent="a5"]') as Element;
    expect(adhoc.className).toMatch(/adhoc/);
    expect(adhoc.className).not.toMatch(/open/);
    expect((dash.querySelector('[data-agent="a1"]') as Element).className).toMatch(/open/);
  });

  it("shows milestones and the now line", () => {
    renderAt("/tempo");
    expect(lane("Dashboard IA").textContent).toContain("T01 ✓");
    expect(lane("Dashboard IA").textContent).toContain("T02 reprovada");
    expect(lane("Main Harness").textContent).toContain("entregue, esperando teste");
    expect(lane("Finanças Casa").textContent).toContain("plano pronto");
    expect(screen.getAllByTestId("now")).toHaveLength(3);
  });

  it("collapses and reopens a lane", () => {
    renderAt("/tempo");
    const btn = screen.getByRole("button", { name: "agentes de Dashboard IA" });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(lane("Dashboard IA").querySelectorAll("[data-agent]")).toHaveLength(0);
    fireEvent.click(btn);
    expect(lane("Dashboard IA").querySelectorAll("[data-agent]")).toHaveLength(5);
  });

  it("links the project name and the sprint id", () => {
    renderAt("/tempo");
    expect(screen.getByRole("link", { name: "Dashboard IA" }).getAttribute("href")).toBe(
      "/p/dashboard-ia",
    );
    expect(screen.getByRole("link", { name: "S02" }).getAttribute("href")).toBe(
      "/p/dashboard-ia/sprints/S02",
    );
  });

  it("the range buttons change the axis", () => {
    renderAt("/tempo");
    const today = axis();
    expect(today).toMatch(/\d\d:00/);
    expect(screen.getByRole("button", { name: "Hoje" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "7 dias" }));
    expect(screen.getByRole("button", { name: "7 dias" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(axis()).toMatch(/\d\d\/\d\d/);
    expect(axis()).not.toMatch(/:00/);

    fireEvent.click(screen.getByRole("button", { name: "Sprint" }));
    expect(axis()).toMatch(/:00/);
    expect(axis()).not.toBe(today);
  });
});
