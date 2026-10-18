import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { sinceLastCommand } from "./since";

describe("sinceLastCommand", () => {
  it("lists only events after the last command, oldest first", () => {
    const { events } = sinceLastCommand(data, "dashboard-ia");
    const after = Date.parse(data.lastCommand.at);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => Date.parse(e.at) > after)).toBe(true);
    expect(events.map((e) => e.text)).not.toContain("S01 entregue para teste");
    const times = events.map((e) => Date.parse(e.at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("sums spend since the day of the last command", () => {
    const day = data.lastCommand.at.slice(0, 10);
    const days = data.usage.filter((u) => u.projectId === "main-harness" && u.date >= day);
    const { usd, tokens } = sinceLastCommand(data, "main-harness");
    expect(usd).toBeCloseTo(days.reduce((s, u) => s + u.usd, 0));
    expect(tokens).toBe(days.reduce((s, u) => s + u.tokens, 0));
  });

  it("is empty for a project without events", () => {
    expect(sinceLastCommand(data, "planilha-orcamento").events).toEqual([]);
  });
});
