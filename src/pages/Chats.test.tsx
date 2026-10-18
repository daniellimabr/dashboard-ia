import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Chats", () => {
  it("lists the project's chats with status, running agents and detail links", () => {
    renderAt("/p/dashboard-ia/chats");
    const link = screen.getByRole("link", { name: "Executar sprint S02" });
    expect(link.getAttribute("href")).toBe("/p/dashboard-ia/chats/c-dash-2");
    screen.getByRole("link", { name: "hook lento" });
    expect(screen.queryByText("Executar sprint S05")).toBeNull();
    screen.getByText("3 agentes rodando");
    expect(screen.getAllByText("encerrado").length).toBeGreaterThan(0);
  });

  it("shows detail with sprint link, child agents and tasks", () => {
    renderAt("/p/dashboard-ia/chats/c-dash-2");
    screen.getByRole("heading", { name: "Executar sprint S02" });
    expect(screen.getByRole("link", { name: "Sprint S02" }).getAttribute("href")).toBe(
      "/p/dashboard-ia/sprints/S02",
    );
    screen.getByText("Reviewer");
    screen.getByText("Clone 2");
    expect(screen.getAllByText("rodando").length).toBe(3);
    screen.getByText("Tela Bem-vindo de volta");
  });

  it("shows a chat without sprint normally", () => {
    renderAt("/p/dashboard-ia/chats/c-dash-hook");
    screen.getByRole("heading", { name: "hook lento" });
    expect(screen.queryByRole("link", { name: /^Sprint S/ })).toBeNull();
    screen.getByText("Ajustar hook post-edit (lento no Windows)");
  });

  it("shows a message for an unknown chat", () => {
    renderAt("/p/dashboard-ia/chats/nope");
    screen.getByText("Chat não encontrado.");
  });
});
