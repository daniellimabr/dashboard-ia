import { screen } from "@testing-library/react";
import { describe, it } from "vitest";
import { renderAt } from "./test-utils";

describe("routes", () => {
  it.each([
    ["/", "Visão geral"],
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
    screen.getByRole("heading", { level: 2, name: "Chats" });
  });
});
