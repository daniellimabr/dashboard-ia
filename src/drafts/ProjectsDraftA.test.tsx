import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

const toB = () => fireEvent.click(screen.getByRole("button", { name: "Variante B" }));

describe("projects drafts", () => {
  it("chats: newest first with start and last interaction, A and B", () => {
    renderAt("/p/dashboard-ia/rascunho/chats");
    const titles = screen.getAllByRole("link", { name: /Executar sprint S0|hook lento/ });
    expect(titles.map((l) => l.textContent)).toEqual([
      "Executar sprint S02",
      "hook lento",
      "Executar sprint S01",
    ]);
    expect(screen.getAllByText(/última interação/).length).toBeGreaterThan(0);
    toB();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("row")[1]?.textContent).toContain("Executar sprint S02");
  });

  it("sprints: accordion with summary, links when open, A and B", () => {
    renderAt("/p/dashboard-ia/rascunho/sprints");
    expect(screen.getByText(/Fechar o design do front/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /S01/ }));
    expect(screen.getByRole("link", { name: /Sprint plan/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Release Report/ })).toBeTruthy();
    toB();
    expect(screen.getByRole("button", { name: /S02/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("docs: only ADRs and PRDs, A and B", () => {
    renderAt("/p/dashboard-ia/rascunho/docs");
    expect(screen.getByRole("heading", { name: "ADRs" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "PRDs" })).toBeTruthy();
    expect(screen.queryByText(/S02 — Layout/)).toBeNull();
    toB();
    const main = screen.getByRole("list", { name: "Decisões e requisitos" });
    expect(within(main).getAllByRole("listitem")).toHaveLength(2);
  });
});
