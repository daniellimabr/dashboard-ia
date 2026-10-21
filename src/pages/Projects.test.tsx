import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { renderAt } from "../test-utils";

const card = (name: string) =>
  within(screen.getByRole("heading", { name, level: 2 }).closest("article") as HTMLElement);
const href = (c: ReturnType<typeof card>, name: string) =>
  c.getByRole("link", { name }).getAttribute("href");

describe("Projects", () => {
  it("shows one card per project, idle ones included", () => {
    renderAt("/projetos");
    expect(screen.getAllByRole("article")).toHaveLength(data.projects.length);
    card("Bot Telegram").getByText("sem sprint ativa");
  });

  it("shows phase, current sprint and shortcuts to the project tabs", () => {
    renderAt("/projetos");
    const c = card("Dashboard IA");
    c.getByText("Execução");
    expect(href(c, "S02")).toBe("/p/dashboard-ia/sprints/S02");
    expect(href(c, "Dashboard IA")).toBe("/p/dashboard-ia");
    expect(href(c, "Chats")).toBe("/p/dashboard-ia/chats");
    expect(href(c, "Sprints")).toBe("/p/dashboard-ia/sprints");
    expect(href(c, "Backlog e Roadmap")).toBe("/p/dashboard-ia/plan");
    expect(href(c, "Documentos")).toBe("/p/dashboard-ia/docs");
    expect(href(c, "Consumo")).toBe("/p/dashboard-ia/usage");
  });

  it("falls back to the planned sprint", () => {
    renderAt("/projetos");
    expect(href(card("Finanças Casa"), "S03")).toBe("/p/financas-casa/sprints/S03");
  });
});
