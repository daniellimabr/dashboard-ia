import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { data } from "../../data/mock";
import { DataProvider } from "../../lib/useData";
import { Draft, type Screen } from "./index";

const show = (s: Screen, onScreen = vi.fn()) =>
  render(
    <MemoryRouter>
      <DataProvider initial={data}>
        <Draft screen={s} onScreen={onScreen} />
      </DataProvider>
    </MemoryRouter>,
  );

describe("Draft A", () => {
  it("home shows, per project, sprint, task, phase, %, spend, chats, alerts and idle", () => {
    show("home");
    const row = screen.getByRole("region", { name: "Dashboard IA" });
    const r = within(row);
    expect(r.getByText("S02")).toBeTruthy();
    expect(r.getAllByText(/T0\d/).length).toBeGreaterThan(0);
    expect(r.getByText("Execução")).toBeTruthy();
    expect(r.getByRole("meter", { name: /progresso/i })).toBeTruthy();
    expect(r.getByText("US$ 3,10")).toBeTruthy();
    expect(r.getByText("Executar sprint S02")).toBeTruthy();
    expect(r.getByText("Reviewer reprovou T02")).toBeTruthy();
    const idle = within(screen.getByRole("region", { name: /ociosos/i }));
    expect(idle.getByText("Bot Telegram")).toBeTruthy();
  });

  it("frame has limits, project switcher and a working menu", () => {
    const onScreen = vi.fn();
    show("home", onScreen);
    expect(screen.getByRole("meter", { name: "Limite 5 h" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Projeto" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sala de controle" }));
    expect(onScreen).toHaveBeenCalledWith("control");
    fireEvent.click(screen.getByRole("button", { name: /tema/i }));
  });

  it.each(["components", "control", "sprints"] as const)("renders %s", (s) => {
    show(s);
    expect(screen.getByRole("main").textContent).not.toBe("");
    expect(screen.getByRole("contentinfo").textContent).toMatch(/S09/);
  });

  it("sprints follows the selected project", () => {
    show("sprints");
    fireEvent.change(screen.getByRole("combobox", { name: "Projeto" }), {
      target: { value: "main-harness" },
    });
    expect(screen.getByText("Eventos em arquivo")).toBeTruthy();
  });
});
