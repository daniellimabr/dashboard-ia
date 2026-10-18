import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "./test-utils";

describe("routes", () => {
  it.each([
    ["/", "Bem-vindo de volta"],
    ["/controle", "Sala de controle"],
    ["/tempo", "Linha do tempo"],
    ["/ociosos", "Ociosos"],
  ])("%s is a menu screen with its own URL", (path, tab) => {
    renderAt(path);
    expect(
      screen.getByRole("link", { name: new RegExp(`^${tab}`) }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("shows both subscription limits on every screen", () => {
    renderAt("/tempo");
    screen.getByRole("meter", { name: "Limite 5 h" });
    screen.getByRole("meter", { name: "Semanal" });
    screen.getByText(/^renova em /);
  });

  it("counts idle projects in the menu", () => {
    renderAt("/");
    screen.getByRole("link", { name: "Ociosos (2)" });
  });

  it.each([
    ["/p/dashboard-ia/chats", "Dashboard IA"],
    ["/p/main-harness/sprints", "Main Harness"],
    ["/p/x/chats", "Projeto não encontrado"],
    ["/nada", "Página não encontrada"],
  ])("%s renders", (path, title) => {
    renderAt(path);
    screen.getByRole("heading", { level: 1, name: title });
  });

  it("redirects a project to its chats tab", () => {
    renderAt("/p/dashboard-ia");
    expect(screen.getByRole("link", { name: "Chats" }).getAttribute("aria-current")).toBe("page");
  });
});
