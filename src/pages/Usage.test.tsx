import { formatTokens, formatUsd } from "../lib/format";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { Chat, Sprint } from "../data/types";
import { renderAt } from "../test-utils";

const region = (name: RegExp) => screen.getByRole("region", { name });

describe("Usage page", () => {
  it("shows the project total (US$ and tokens) and one bar per day", () => {
    renderAt("/p/dashboard-ia/usage");
    const mine = data.usage.filter((u) => u.projectId === "dashboard-ia");
    const total = region(/Total do projeto/);
    expect(screen.getByTestId("usage-usd").textContent).toBe(
      formatUsd(mine.reduce((s, u) => s + u.usd, 0)),
    );
    expect(total.textContent).toContain(formatTokens(mine.reduce((s, u) => s + u.tokens, 0)));
    expect(within(total).getByRole("meter", { name: /Parte do gasto total/ })).toBeTruthy();
    const days = new Set(mine.map((u) => u.date));
    expect(within(total).getAllByLabelText(/US\$/)).toHaveLength(days.size);
  });

  it("compares all projects", () => {
    renderAt("/p/dashboard-ia/usage");
    expect(within(region(/Projetos/)).getAllByRole("row")).toHaveLength(1 + data.projects.length);
  });

  it("lists days newest first; an open day splits its cost by sprint and outside a sprint", async () => {
    const usage = [
      { projectId: "dashboard-ia", date: "2026-10-20", sprintId: "S06", tokens: 1000, usd: 2 },
      { projectId: "dashboard-ia", date: "2026-10-21", tokens: 500, usd: 0.5 },
      { projectId: "dashboard-ia", date: "2026-10-21", sprintId: "S07", tokens: 2000, usd: 3 },
      { projectId: "other", date: "2026-10-21", sprintId: "S01", tokens: 9, usd: 9 },
    ];
    renderAt("/p/dashboard-ia/usage", { ...data, usage });
    const days = [...region(/Por dia/).querySelectorAll("details")];
    expect(days.map((d) => d.querySelector("summary")?.textContent)).toEqual([
      expect.stringContaining("21/10"),
      expect.stringContaining("20/10"),
    ]);
    const latest = days[0] as HTMLDetailsElement;
    expect(latest.querySelector("summary")?.textContent).toContain(formatUsd(3.5));
    await userEvent.click(within(latest).getByText("21/10"));
    expect(latest.open).toBe(true);
    const rows = within(latest)
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent);
    expect(rows).toEqual([
      expect.stringMatching(/^S07.*3,00/),
      expect.stringMatching(/^Fora de sprint.*0,50/),
    ]);
  });

  it("Por sprint lists each sprint with %, US$ and tokens by kind; open it to see tasks and agents; missing = —", async () => {
    const c = {
      input: 1000,
      output: 2000,
      cacheRead: 3000,
      cacheWrite: 4000,
      usd: 2.5,
      pct5h: 8.3,
      pctWeek: 120,
    };
    const sprint: Sprint = {
      id: "S99",
      projectId: "dashboard-ia",
      title: "Teste",
      status: "active",
      consumption: c,
      tasks: [
        { id: "T01", title: "Primeira", done: true, consumption: c },
        { id: "T02", title: "Segunda", done: false },
      ],
    };
    const chat: Chat = {
      id: "c99",
      title: "Chat",
      startedAt: "2026-10-20T10:00:00Z",
      tasks: [],
      projectId: "dashboard-ia",
      sprintId: "S99",
      agents: [
        {
          id: "a1",
          kind: "clone" as const,
          name: "Clone 9",
          startedAt: "2026-10-20T10:00:00Z",
          consumption: c,
        },
      ],
    };
    renderAt("/p/dashboard-ia/usage", { ...data, sprints: [sprint], chats: [chat] });
    const acc = region(/Por sprint/).querySelectorAll("details");
    expect(acc).toHaveLength(1);
    const det = acc[0] as HTMLElement;
    const sum = det.querySelector("summary")?.textContent ?? "";
    expect(sum).toContain("S99");
    expect(sum).toContain(formatUsd(2.5));
    expect(sum).toContain("8,3%");
    expect(sum).toContain("120,0%");
    await userEvent.click(within(det).getByText("S99"));
    const rows = within(det).getAllByRole("row");
    expect(rows[0]?.textContent).toMatch(/Entrada.*Saída.*Cache lido.*Cache escrito/);
    const text = (name: RegExp) =>
      rows.find((r) => name.test(r.textContent ?? ""))?.textContent ?? "";
    expect(text(/T01/)).toContain(formatTokens(3000));
    expect(text(/Clone 9/)).toContain(formatUsd(2.5));
    expect(text(/T02/)).toContain("—");
  });

  it("shows sem dado when the project has no usage", () => {
    renderAt("/p/dashboard-ia/usage", { ...data, usage: [] });
    expect(region(/Por dia/).textContent).toContain("sem dado");
  });
});
