import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { data } from "../../data/mock";
import { DataProvider } from "../../lib/useData";
import { Draft, type Screen } from "./index";

const show = (screen: Screen, onScreen = vi.fn()) =>
  render(
    <MemoryRouter>
      <DataProvider initial={data}>
        <Draft screen={screen} onScreen={onScreen} />
      </DataProvider>
    </MemoryRouter>,
  );

describe("Draft C", () => {
  it("home shows, per project, sprint, task, phase, %, spend, open chats, alerts and idle", () => {
    show("home");
    const panel = screen.getByRole("region", { name: "Dashboard IA" });
    const p = within(panel);
    expect(p.getByTestId("sprint").textContent).toContain("S02");
    expect(p.getByText("Execução")).toBeTruthy();
    expect(p.getAllByText(/\d+%/).length).toBeGreaterThan(0);
    expect(p.getAllByText(/US\$/).length).toBeGreaterThan(0);
    expect(p.getByText("Executar sprint S02")).toBeTruthy();
    expect(p.getByText("Reviewer reprovou T02")).toBeTruthy();
    expect(p.getByTestId("current-task").textContent).toMatch(/T\d\d/);
    const idle = screen.getByRole("region", { name: /Ociosos/ });
    expect(within(idle).getByText("Bot Telegram")).toBeTruthy();
  });

  it("frame has limits, project list and calls onScreen", async () => {
    const onScreen = vi.fn();
    show("home", onScreen);
    expect(screen.getByRole("meter", { name: "Limite 5 h" })).toBeTruthy();
    expect(screen.getByRole("meter", { name: "Semanal" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Projetos" });
    expect(within(nav).getByText("Main Harness")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Sala de controle" }));
    expect(onScreen).toHaveBeenCalledWith("control");
  });

  it.each(["components", "control", "sprints"] as const)("renders %s", (s) => {
    show(s);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByRole("contentinfo").textContent).toContain("S09");
  });

  it("sprints follows the project picked in the sidebar", async () => {
    show("sprints");
    await userEvent.click(screen.getByRole("button", { name: /Main Harness/ }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Main Harness");
  });
});
