import { describe, expect, it } from "vitest";
import type { UsageDay } from "../data/types";
import { dailySeries, usageByProject } from "./usage";

const usage: UsageDay[] = [
  { projectId: "a", date: "2026-10-15", tokens: 100, usd: 1 },
  { projectId: "a", date: "2026-10-16", tokens: 200, usd: 2 },
  { projectId: "b", date: "2026-10-15", tokens: 700, usd: 1 },
];

describe("usage", () => {
  it("totals per project with share of spend", () => {
    expect(usageByProject(usage)).toEqual([
      { projectId: "a", tokens: 300, usd: 3, pct: 75 },
      { projectId: "b", tokens: 700, usd: 1, pct: 25 },
    ]);
  });

  it("builds a sorted daily series, optionally per project", () => {
    expect(dailySeries(usage)).toEqual([
      { date: "2026-10-15", tokens: 800, usd: 2 },
      { date: "2026-10-16", tokens: 200, usd: 2 },
    ]);
    expect(dailySeries(usage, "b")).toEqual([{ date: "2026-10-15", tokens: 700, usd: 1 }]);
  });
});
