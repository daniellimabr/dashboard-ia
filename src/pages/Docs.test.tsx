import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { Doc } from "../data/types";
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

  const real = (rel: string, markdown: string): Doc => ({
    id: `dashboard-ia:docs/${rel}`,
    projectId: "dashboard-ia",
    kind: "adr",
    title: rel,
    date: "2026-10-21",
    markdown,
  });
  const realData = {
    ...data,
    docs: [
      real(
        "sprints/S01-plan.md",
        "# Plano S01\n\n[ADR](../adr/0001-x.md#ctx) [fora](../../README.md) [sumiu](nope.md) [ruim](a%zz.md) [web](https://x.dev)",
      ),
      real("adr/0001-x.md", "# ADR um"),
    ],
  };

  it("opens docs whose id has a slash (encoded link and direct route)", async () => {
    renderAt("/p/dashboard-ia/docs", realData);
    const link = screen.getByRole("link", { name: "adr/0001-x.md" });
    expect(link.getAttribute("href")).toBe(
      "/p/dashboard-ia/docs/dashboard-ia%3Adocs%2Fadr%2F0001-x.md",
    );
    fireEvent.click(link);
    expect(await screen.findByRole("heading", { name: "ADR um" })).toBeTruthy();
  });

  it("turns relative .md links into panel links and flags broken ones", async () => {
    renderAt("/p/dashboard-ia/docs/dashboard-ia%3Adocs%2Fsprints%2FS01-plan.md", realData);
    const adr = screen.getByRole("link", { name: "ADR" });
    expect(adr.getAttribute("href")).toBe(
      "/p/dashboard-ia/docs/dashboard-ia%3Adocs%2Fadr%2F0001-x.md",
    );
    expect(screen.queryByRole("link", { name: "fora" })).toBeNull();
    expect(screen.queryByRole("link", { name: "sumiu" })).toBeNull();
    expect(screen.getByText("fora (não encontrado)")).toBeTruthy();
    expect(screen.getByText("sumiu (não encontrado)")).toBeTruthy();
    expect(screen.getByText("ruim (não encontrado)")).toBeTruthy();
    expect(screen.getByRole("link", { name: "web" }).getAttribute("href")).toBe("https://x.dev");
    fireEvent.click(adr);
    expect(await screen.findByRole("heading", { name: "ADR um" })).toBeTruthy();
  });

  it("shows a message for a project without docs", () => {
    renderAt("/p/planilha-orcamento/docs");
    expect(screen.getByText("Nenhum documento neste projeto.")).toBeTruthy();
  });
});
