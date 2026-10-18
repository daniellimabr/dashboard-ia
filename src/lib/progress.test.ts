import { describe, expect, it } from "vitest";
import type { Task } from "../data/types";
import { agentLabel, currentWave, ganttLayout, sprintPct, taskPct, taskStatus } from "./progress";

const t = (over: Partial<Task>): Task => ({ id: "T01", title: "x", done: false, ...over });

describe("progress", () => {
  it("derives task status", () => {
    expect(taskStatus(t({ done: true, startedAt: "a", endedAt: "b" }))).toBe("done");
    expect(taskStatus(t({ review: "fail", startedAt: "a", endedAt: "b" }))).toBe("failed");
    expect(taskStatus(t({ startedAt: "a" }))).toBe("running");
    expect(taskStatus(t({}))).toBe("todo");
  });

  it("task % = steps done ÷ 5", () => {
    expect(taskPct(t({ done: true }))).toBe(100);
    expect(taskPct(t({ steps: 2, startedAt: "a" }))).toBe(40);
    expect(taskPct(t({ steps: 3 }))).toBe(0); // not started yet
    expect(taskPct(t({}))).toBe(0);
  });

  it("sprint % = average of tasks", () => {
    expect(sprintPct([t({ done: true }), t({ steps: 1, startedAt: "a" })])).toBe(60);
    expect(sprintPct([])).toBe(0);
  });

  it("current wave = first wave with unfinished tasks", () => {
    const tasks = [t({ wave: 1, done: true }), t({ wave: 2 }), t({ wave: 3 })];
    expect(currentWave(tasks)).toEqual({ current: 2, total: 3 });
    expect(currentWave([t({ wave: 1, done: true })])).toEqual({ current: 1, total: 1 });
  });

  it("lays tasks on the gantt by plan", () => {
    const g = ganttLayout([
      t({ id: "A", plan: { start: 0, duration: 30, deps: [] } }),
      t({ id: "B", plan: { start: 30, duration: 90, deps: ["A"] } }),
    ]);
    expect(g.span).toBe(120);
    expect(g.rows).toEqual([
      { id: "A", left: 0, width: 25, deps: [] },
      { id: "B", left: 25, width: 75, deps: ["A"] },
    ]);
  });

  it("labels agents TL, C<n>, RV", () => {
    expect(agentLabel("tech-lead")).toBe("TL");
    expect(agentLabel("reviewer")).toBe("RV");
    expect(agentLabel("clone", "Clone 2")).toBe("C2");
    expect(agentLabel("clone")).toBe("C");
  });
});
