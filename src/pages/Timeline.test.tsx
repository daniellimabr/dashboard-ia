import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

const project = (name: string) => within(screen.getByRole("region", { name }));
const axis = () => screen.getByTestId("axis").textContent;

describe("Timeline", () => {
  it("groups agents by sprint or loose chat", () => {
    renderAt("/tempo");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Linha do tempo");
    const lane = project("Dashboard IA");
    const sprint = within(lane.getByRole("group", { name: "S02 Layout da tela principal" }));
    expect(sprint.getByText("Clone 1")).toBeTruthy();
    expect(sprint.getByText("Clone 2")).toBeTruthy();
    expect(sprint.getByText("Em execução")).toBeTruthy();
    const loose = within(lane.getByRole("group", { name: "hook lento" }));
    expect(loose.getByText("Tech Lead")).toBeTruthy();
    expect(loose.getByText("fora da sprint")).toBeTruthy();
    expect(loose.queryByText("Clone 1")).toBeNull();
  });

  it("the range tabs change the axis and the groups", async () => {
    renderAt("/tempo");
    const today = axis();
    expect(today).toMatch(/\d\d:00/);
    await userEvent.click(screen.getByRole("tab", { name: "7 dias" }));
    expect(screen.getByRole("tab", { name: "7 dias" }).getAttribute("aria-selected")).toBe("true");
    expect(axis()).toMatch(/\d\d\/\d\d/);
    expect(
      project("Dashboard IA").getByRole("group", { name: "S01 Draft do front do painel" }),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Sprint" }));
    expect(axis()).toMatch(/:00/);
    expect(axis()).not.toBe(today);
  });

  it("opens with the range from the URL", () => {
    renderAt("/tempo?periodo=7%20dias");
    expect(screen.getByRole("tab", { name: "7 dias" }).getAttribute("aria-selected")).toBe("true");
  });

  it("collapses and reopens a project", async () => {
    renderAt("/tempo");
    const lane = project("Dashboard IA");
    const btn = lane.getByRole("button", { name: "Agentes de Dashboard IA" });
    await userEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(lane.queryByRole("group")).toBeNull();
    await userEvent.click(btn);
    expect(lane.getAllByRole("group").length).toBeGreaterThan(0);
  });
});
