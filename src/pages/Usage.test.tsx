import { formatUsd } from "../lib/format";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { renderAt } from "../test-utils";

describe("Usage page", () => {
  it("shows the project's US$ total and a 14-bar chart", () => {
    renderAt("/p/dashboard-ia/usage");
    const total = data.usage
      .filter((u) => u.projectId === "dashboard-ia")
      .reduce((s, u) => s + u.usd, 0);
    expect(screen.getByTestId("usage-usd").textContent).toBe(formatUsd(total));
    const chart = screen.getByRole("img", { name: /US\$ por dia/ });
    expect(chart.querySelectorAll("rect")).toHaveLength(14);
  });

  it("compares all projects", () => {
    renderAt("/p/dashboard-ia/usage");
    expect(screen.getAllByRole("table").at(-1)?.querySelectorAll("tr")).toHaveLength(
      1 + data.projects.length,
    );
  });

  it("lists days newest first; an open day splits its cost by sprint and outside a sprint", async () => {
    const usage = [
      { projectId: "dashboard-ia", date: "2026-10-20", sprintId: "S06", tokens: 1000, usd: 2 },
      { projectId: "dashboard-ia", date: "2026-10-21", tokens: 500, usd: 0.5 },
      { projectId: "dashboard-ia", date: "2026-10-21", sprintId: "S07", tokens: 2000, usd: 3 },
      { projectId: "other", date: "2026-10-21", sprintId: "S01", tokens: 9, usd: 9 },
    ];
    renderAt("/p/dashboard-ia/usage", { ...data, usage });
    const days = screen.getAllByTestId("usage-day");
    expect(days.map((d) => d.querySelector("summary")?.textContent)).toEqual([
      expect.stringContaining("21/10"),
      expect.stringContaining("20/10"),
    ]);
    const latest = days[0] as HTMLDetailsElement;
    expect(latest.querySelector("summary")?.textContent).toContain(formatUsd(3.5));
    await userEvent.click(within(latest).getByText(/21\/10/));
    expect(latest.open).toBe(true);
    const rows = within(latest)
      .getAllByRole("row")
      .map((r) => r.textContent);
    expect(rows).toEqual([
      expect.stringMatching(/^S07.*3,00/),
      expect.stringMatching(/^Fora de sprint.*0,50/),
    ]);
  });
});
