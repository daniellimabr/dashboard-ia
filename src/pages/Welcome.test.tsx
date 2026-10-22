import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { formatTime } from "../lib/time";
import { renderAt } from "../test-utils";

describe("Welcome page", () => {
  it("says when and where the last command was", () => {
    renderAt("/");
    const p = screen.getByText(/Seu último comando foi/);
    expect(p.textContent).toContain(formatTime(data.lastCommand.at));
    expect(p.textContent).toContain("no chat Executar sprint S01 (Dashboard IA)");
    expect(p.textContent).toContain("há 2 dias");
    const waiting = data.projects.slice(0, 3).filter((x) => x.alerts?.length).length;
    expect(p.textContent).toContain(`${waiting} de 3 projetos esperam algo de você.`);
  });

  it("shows only active projects, each with the 5 blocks", () => {
    renderAt("/");
    const cols = screen.getAllByRole("region");
    expect(cols.map((c) => within(c).getByRole("heading", { level: 2 }).textContent)).toEqual([
      "Dashboard IA",
      "Main Harness",
      "Finanças Casa",
    ]);
    expect(within(screen.getByRole("main")).queryByText("Bot Telegram")).toBeNull();
    for (const c of cols) {
      expect(
        within(c)
          .getAllByRole("heading", { level: 3 })
          .map((h) => h.textContent),
      ).toEqual(["Onde parou", "Desde o seu último comando", "Documentos", "Topo do backlog"]);
      expect(within(c).getByText("Próximo passo")).toBeTruthy();
    }
  });

  it("encodes doc ids that contain a slash", () => {
    const docs = data.docs.map((d) =>
      d.id === "S02-plan" ? { ...d, id: "dashboard-ia:sprints/S02-plan.md" } : d,
    );
    renderAt("/", { ...data, docs });
    expect(
      screen.getByRole("link", { name: /Layout da tela principal/ }).getAttribute("href"),
    ).toBe("/p/dashboard-ia/docs/dashboard-ia%3Asprints%2FS02-plan.md");
  });

  it("links documents to the project's Documentos tab", () => {
    renderAt("/");
    const link = screen.getByRole("link", { name: /Layout da tela principal/ });
    expect(link.getAttribute("href")).toBe("/p/dashboard-ia/docs/S02-plan");
    expect(
      within(screen.getByRole("region", { name: "Dashboard IA" }))
        .getByText("nenhum nesta sprint")
        .closest("a"),
    ).toBeNull();
  });

  it("lists the top 3 backlog items without priority or final dot", () => {
    renderAt("/");
    const col = screen.getByRole("region", { name: "Dashboard IA" });
    const items = within(col).getAllByRole("listitem").slice(-3);
    expect(items.map((i) => i.textContent)).toEqual([
      "Servidor local + SQLite + importador de eventos",
      "Ligar telas aos dados reais (a cada 5 s)",
      "Consumo real em tokens e US$",
    ]);
  });

  it("skips done backlog items and hides the status mark", () => {
    const backlog = `- [alta] 2026-10-18 [concluído: S05] — Feito.
- [alta] 2026-10-21 [planejado: S07] — Telas dos drafts:
  - **Sala:** B.
- [média] 2026-10-16 — Link VS Code.
- [baixa] 2026-10-16 — Ações.`;
    const projects = data.projects.map((p) => (p.id === "dashboard-ia" ? { ...p, backlog } : p));
    renderAt("/", { ...data, projects });
    const col = screen.getByRole("region", { name: "Dashboard IA" });
    const items = within(col).getAllByRole("listitem").slice(-3);
    expect(items.map((i) => i.textContent)).toEqual(["Telas dos drafts", "Link VS Code", "Ações"]);
  });
});
