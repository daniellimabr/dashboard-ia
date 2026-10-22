import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { data } from "../../data/mock";
import { activeSprint } from "../../lib/select";
import { sprintPct } from "../../lib/progress";
import { DataProvider } from "../../lib/useData";
import { Draft, type Screen } from ".";

const renderScreen = (screenName: Screen, onScreen = vi.fn()) =>
  render(
    <MemoryRouter>
      <DataProvider initial={data}>
        <Draft screen={screenName} onScreen={onScreen} />
      </DataProvider>
    </MemoryRouter>,
  );

describe("Draft B (editorial)", () => {
  it("home shows, per active project, sprint, task, phase, %, spend, chats and alerts", () => {
    renderScreen("home");
    for (const p of data.projects.slice(0, 3)) {
      const card = screen.getByRole("region", { name: p.name });
      if (p.phase) expect(within(card).getAllByText(p.phase.label).length).toBeGreaterThan(0);
      const sprint = activeSprint(data, p.id);
      if (sprint) {
        expect(within(card).getAllByText(new RegExp(sprint.id)).length).toBeGreaterThan(0);
        expect(within(card).getByText(`${sprintPct(sprint.tasks)}%`)).toBeTruthy();
      }
      expect(within(card).getByText(/Tarefa atual|Sem tarefa em andamento/)).toBeTruthy();
      expect(within(card).getByText(/gastos? hoje/)).toBeTruthy();
      expect(within(card).getByText(/chats? abertos?|Nenhum chat aberto/)).toBeTruthy();
      for (const a of p.alerts ?? []) expect(within(card).getByText(a.title)).toBeTruthy();
    }
    const idle = screen.getByRole("region", { name: /Ociosos/ });
    expect(within(idle).getByText("Bot Telegram")).toBeTruthy();
    expect(within(idle).getByText("Planilha Orçamento")).toBeTruthy();
  });

  it("frame has menu, project switch, limits and theme toggle; menu calls onScreen", async () => {
    const onScreen = vi.fn();
    renderScreen("home", onScreen);
    expect(screen.getAllByRole("meter")).toHaveLength(2);
    expect(screen.getByRole("combobox", { name: "Projeto" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Sala de controle" }));
    expect(onScreen).toHaveBeenCalledWith("control");
    const theme = screen.getByRole("button", { name: /Modo escuro/ });
    await userEvent.click(theme);
    expect(screen.getByRole("button", { name: /Modo claro/ })).toBeTruthy();
    expect(screen.getByText(/Editorial limpo/)).toBeTruthy();
  });

  it.each<[Screen, RegExp]>([
    ["components", /Folha de componentes/],
    ["control", /Sala de controle/],
    ["sprints", /Sprints/],
  ])("renders %s", (s, heading) => {
    renderScreen(s);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy();
  });
});
