import { formatTokens, formatUsd } from "../lib/format";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { dailySeries } from "../lib/usage";
import { renderAt } from "../test-utils";

const card = (name: string) =>
  within(screen.getByRole("main")).getByRole("link", { name }).closest("article") as HTMLElement;

describe("Overview", () => {
  it("shows one card per project linking to it", () => {
    renderAt("/");
    for (const p of data.projects) {
      expect(
        within(screen.getByRole("main")).getByRole("link", { name: p.name }).getAttribute("href"),
      ).toBe(`/p/${p.id}`);
    }
  });

  it("shows the active sprint, running agents and today's usage", () => {
    renderAt("/");
    const dash = within(card("Dashboard IA"));
    dash.getByText("S01 · Draft do front do painel");
    dash.getByText("2/8 tarefas feitas");
    dash.getByText("Clone T02");
    expect(dash.queryByText("Clone T07")).toBeNull(); // ended
    const { usd, tokens } = dailySeries(data.usage, "dashboard-ia").at(-1) ?? { usd: 0, tokens: 0 };
    dash.getByText(`${formatUsd(usd)} · ${formatTokens(tokens)} tokens`.replace(/\s+/g, " "));
  });

  it("says when there is no active sprint or agent", () => {
    renderAt("/");
    const loja = within(card("Loja Online"));
    loja.getByText("sem sprint ativa");
    loja.getByText("nenhum agente rodando");
  });
});
