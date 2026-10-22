import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

const item = (title: string) =>
  screen.getByText(title, { selector: "summary b" }).closest("details");

describe("Chats", () => {
  it("lists the project's chats, open ones first, as accordions", () => {
    renderAt("/p/dashboard-ia/chats");
    const titles = [...document.querySelectorAll("details summary b")].map((b) => b.textContent);
    expect(titles).toEqual(["Executar sprint S02", "hook lento", "Executar sprint S01"]);
    expect(screen.getAllByText("sem sprint").length).toBeGreaterThan(0);
    expect(screen.getAllByText("em andamento").length).toBeGreaterThan(0);
    expect(screen.queryByText("Executar sprint S05")).toBeNull();
    expect(document.querySelector("details[open]")).toBeNull();
  });

  it("opens the chat in the URL with its agents and tasks", () => {
    renderAt("/p/dashboard-ia/chats/c-dash-2");
    expect(item("Executar sprint S02")?.open).toBe(true);
    expect(item("hook lento")?.open).toBe(false);
    screen.getByText("Reviewer");
    screen.getByText("Clone 2");
    screen.getByText("Tela Bem-vindo de volta");
  });

  it("shows an empty state when the project has no chats", () => {
    renderAt("/p/planilha-orcamento/chats");
    screen.getByText("Nenhum chat ainda");
  });
});
