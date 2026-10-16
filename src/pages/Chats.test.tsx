import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Chats", () => {
  it("lists the project's chats with status, running agents and detail links", () => {
    renderAt("/p/dashboard-ia/chats");
    const link = screen.getByRole("link", { name: "Executar sprint S01" });
    expect(link.getAttribute("href")).toBe("/p/dashboard-ia/chats/c-dash-1");
    screen.getByRole("link", { name: "Conversa sobre o painel e plano da S01" });
    expect(screen.queryByText("Executar sprint S06")).toBeNull();
    screen.getByText("4 agentes rodando");
    screen.getByText("encerrado");
  });

  it("shows detail with sprint link, child agents and tasks", () => {
    renderAt("/p/dashboard-ia/chats/c-dash-1");
    screen.getByRole("heading", { name: "Executar sprint S01" });
    expect(screen.getByRole("link", { name: "Sprint S01" }).getAttribute("href")).toBe(
      "/p/dashboard-ia/sprints/S01",
    );
    screen.getByText("Clone T07");
    screen.getByText("Clone T03");
    expect(screen.getAllByText("rodando").length).toBe(4);
    screen.getByText("Tela Visão geral");
  });

  it("shows a chat without sprint normally", () => {
    renderAt("/p/dashboard-ia/chats/c-dash-0");
    screen.getByRole("heading", { name: "Conversa sobre o painel e plano da S01" });
    expect(screen.queryByRole("link", { name: /^Sprint S/ })).toBeNull();
    screen.getByText("Nenhuma tarefa.");
  });

  it("shows a message for an unknown chat", () => {
    renderAt("/p/dashboard-ia/chats/nope");
    screen.getByText("Chat não encontrado.");
  });
});
