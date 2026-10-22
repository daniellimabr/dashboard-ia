import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { Data } from "../data/types";
import { renderAt } from "../test-utils";

const withBacklog = (backlog: string): Data => ({
  ...data,
  projects: data.projects.map((p) => (p.id === "dashboard-ia" ? { ...p, backlog } : p)),
});

const MD = `# Backlog

- [alta] 2026-10-21 [concluído: S05] — Navegação.
- [alta] 2026-10-22 [planejado: S07] — Telas:
  - **Sala:** B.
- [média] 2026-10-16 — Link VS Code.
`;

describe("Backlog page", () => {
  it("shows a table with open items first and filters by situation", () => {
    renderAt("/p/dashboard-ia/backlog", withBacklog(MD));
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Link VS Code.*aberto.*média.*2026-10-16/),
      expect.stringMatching(/Telas.*Sala: B.*planejado S07/),
      expect.stringMatching(/Navegação.*concluído S05/),
    ]);
    fireEvent.click(screen.getByRole("tab", { name: "Concluídos (1)" }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Concluídos (1)" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("reads the old format with no date as open", () => {
    renderAt("/p/dashboard-ia/backlog");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(within(table).getAllByText("sem dado")).toHaveLength(5);
  });

  it("falls back to the raw markdown outside the format", () => {
    renderAt("/p/dashboard-ia/backlog", withBacklog("# Backlog\n\nTexto livre."));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Texto livre.")).toBeTruthy();
  });
});
