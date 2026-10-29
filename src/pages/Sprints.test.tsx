import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { ModelUsage } from "../data/types";
import { formatTokens, formatUsd } from "../lib/format";
import { renderAt } from "../test-utils";

const item = (id: string) => screen.getByText(id, { selector: "b" }).closest("details");

describe("Sprints", () => {
  it("lists sprints newest first with status and progress", () => {
    renderAt("/p/main-harness/sprints");
    screen.getByText("Comando hx run");
    screen.getByText("Registro central de projetos");
    expect(screen.getAllByText("fechada")).toHaveLength(2);
    // progress in the list plus the "Sem onda" group header of a plan without waves
    expect(screen.getAllByText(/^3\/3/).length).toBeGreaterThan(0);
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

  describe("consumo por modelo", () => {
    const withUsage = (byModel?: ModelUsage[]) => ({
      ...data,
      sprints: data.sprints.map((x) =>
        x.id === "S02" && x.projectId === "dashboard-ia" ? { ...x, byModel } : x,
      ),
    });

    it("shows one row per Claude model and Gemini apart", () => {
      renderAt(
        "/p/dashboard-ia/sprints",
        withUsage([
          { model: "opus", input: 1500, output: 2000, cache: 30000, usd: 1.5 },
          { model: "gemini-2.5", input: 900, output: 100, cache: 0, usd: 0, external: true },
        ]),
      );
      const row = screen.getByRole("row", { name: /opus/ });
      expect(row.textContent).toContain(formatUsd(1.5));
      expect(row.textContent).toContain(formatTokens(30000));
      expect(screen.queryByRole("row", { name: /gemini/ })).toBeNull();
      expect(screen.getByText(/gemini-2\.5/).textContent).toContain("fora do Claude · US$ 0");
    });

    it("hides the block when the sprint has no usage", () => {
      renderAt("/p/dashboard-ia/sprints", withUsage());
      expect(screen.queryByText("Consumo por modelo")).toBeNull();
    });
  });

  it("shows an empty state when the project has no sprints", () => {
    renderAt("/p/planilha-orcamento/sprints");
    screen.getByText("Nenhuma sprint ainda");
  });
});
