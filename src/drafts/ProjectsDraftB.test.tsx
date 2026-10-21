import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

const toB = () => fireEvent.click(screen.getByRole("button", { name: "Variante B" }));

describe("projects drafts B", () => {
  it("backlog: item control table in A, kanban in B", () => {
    renderAt("/p/dashboard-ia/rascunho/backlog");
    expect(screen.getByRole("columnheader", { name: "Pronto em" })).toBeTruthy();
    toB();
    expect(screen.getByRole("heading", { name: /Planejado/ })).toBeTruthy();
  });

  it("roadmap: current stage highlighted in A, timeline in B", () => {
    renderAt("/p/dashboard-ia/rascunho/roadmap");
    expect(screen.getAllByText("atual").length).toBeGreaterThan(0);
    toB();
    expect(screen.getByRole("list", { name: "Etapas" })).toBeTruthy();
  });

  it("usage: by day/sprint/agent in A, table in B", () => {
    renderAt("/p/dashboard-ia/rascunho/usage");
    expect(screen.getByRole("heading", { name: "Por agente" })).toBeTruthy();
    toB();
    expect(screen.getByRole("columnheader", { name: "Agente" })).toBeTruthy();
  });
});
