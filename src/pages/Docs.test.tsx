import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { Doc } from "../data/types";
import { renderAt } from "../test-utils";

const list = () => within(screen.getByRole("navigation", { name: "Documentos" }));

describe("Docs", () => {
  it("lists every doc kind in groups, with nothing open yet", () => {
    renderAt("/p/dashboard-ia/docs");
    list().getByText("ADRs");
    list().getByText("PRDs");
    list().getByText("Sprint plans");
    const link = list().getByRole("link", { name: "ADR 0001 — Arquitetura do painel" });
    expect(link.getAttribute("href")).toBe("/p/dashboard-ia/docs/adr-0001");
    screen.getByText("Escolha um documento");
  });

  it("opens the doc in the URL next to the list and marks it", () => {
    renderAt("/p/dashboard-ia/docs/prd-0001");
    screen.getByRole("heading", { name: "Problema" });
    const current = list()
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current"));
    expect(current.map((a) => a.getAttribute("href"))).toEqual(["/p/dashboard-ia/docs/prd-0001"]);
  });

  it("shows a message for an unknown doc", () => {
    renderAt("/p/dashboard-ia/docs/nope");
    screen.getByText("Documento não encontrado.");
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
    screen.getByText("fora (não encontrado)");
    screen.getByText("sumiu (não encontrado)");
    screen.getByText("ruim (não encontrado)");
    expect(screen.getByRole("link", { name: "web" }).getAttribute("href")).toBe("https://x.dev");
    fireEvent.click(adr);
    expect(await screen.findByRole("heading", { name: "ADR um" })).toBeTruthy();
  });

  it("shows an empty state for a project without docs", () => {
    renderAt("/p/planilha-orcamento/docs");
    screen.getByText("Nenhum documento");
  });
});
