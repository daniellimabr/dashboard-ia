import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Plan", () => {
  it("renders backlog and roadmap markdown", () => {
    renderAt("/p/dashboard-ia/plan");
    expect(screen.getByRole("heading", { name: "Backlog — Dashboard IA" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Roadmap — Dashboard IA" })).toBeTruthy();
  });
});

describe("Docs", () => {
  it("lists docs grouped by kind and hides empty groups", () => {
    renderAt("/p/dashboard-ia/docs");
    expect(screen.getByRole("heading", { name: "Sprint plans" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "ADRs" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Handoffs" })).toBeNull();
    const link = screen.getByRole("link", { name: "ADR 0001 — Arquitetura do painel" });
    expect(link.getAttribute("href")).toBe("/p/dashboard-ia/docs/adr-0001");
  });

  it("shows a doc rendered with a link back", () => {
    renderAt("/p/dashboard-ia/docs/prd-0001");
    expect(screen.getByRole("heading", { name: "Problema" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Voltar/ }).getAttribute("href")).toBe(
      "/p/dashboard-ia/docs",
    );
  });

  it("shows a message for an unknown doc", () => {
    renderAt("/p/dashboard-ia/docs/nope");
    expect(screen.getByText("Documento não encontrado.")).toBeTruthy();
  });

  it("shows a message for a project without docs", () => {
    renderAt("/p/planilha-orcamento/docs");
    expect(screen.getByText("Nenhum documento neste projeto.")).toBeTruthy();
  });
});
