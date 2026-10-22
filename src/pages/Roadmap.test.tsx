import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { Data } from "../data/types";
import { renderAt } from "../test-utils";

const withRoadmap = (roadmap: string): Data => ({
  ...data,
  projects: data.projects.map((p) => (p.id === "dashboard-ia" ? { ...p, roadmap } : p)),
});

describe("Roadmap page", () => {
  it("shows Agora, Próximo, Depois and Feito with sprint cards linking their docs", () => {
    renderAt(
      "/p/dashboard-ia/roadmap",
      withRoadmap("# R\n\n## Feito\n- S01 — Draft.\n\n## Agora\n- S02 — Design.\n- Sem sprint.\n"),
    );
    for (const n of ["Agora", "Próximo", "Depois", "Feito"])
      screen.getByRole("region", { name: n });
    const now = screen.getByRole("region", { name: "Agora" });
    expect(within(now).getByRole("link", { name: "S02" }).getAttribute("href")).toBe(
      "/p/dashboard-ia/docs/S02-plan",
    );
    expect(within(now).getByText("Sem sprint.")).toBeTruthy();
    const done = screen.getByRole("region", { name: "Feito" });
    expect(within(done).getByRole("link", { name: "S01" }).getAttribute("href")).toBe(
      "/p/dashboard-ia/docs/S01-report",
    );
    expect(
      within(screen.getByRole("region", { name: "Depois" })).getByText("Nada aqui."),
    ).toBeTruthy();
  });

  it("falls back to the raw markdown outside the format", () => {
    renderAt("/p/dashboard-ia/roadmap", withRoadmap("# Roadmap\n\nVisão livre."));
    expect(screen.queryByRole("region", { name: "Agora" })).toBeNull();
    expect(screen.getByText("Visão livre.")).toBeTruthy();
  });
});
