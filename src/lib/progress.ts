import type { AgentKind, Task } from "../data/types";
import { STEPS } from "../data/types";

export type TaskStatus = "done" | "failed" | "running" | "todo";

export function taskStatus(t: Task): TaskStatus {
  if (t.done) return "done";
  if (t.review === "fail") return "failed";
  return t.startedAt ? "running" : "todo";
}

/** Steps done ÷ 5, as a rounded %. */
export function taskPct(t: Task): number {
  if (t.done) return 100;
  if (!t.startedAt) return 0;
  return Math.round(((t.steps ?? 0) / STEPS.length) * 100);
}

export const sprintPct = (tasks: Task[]) =>
  tasks.length ? Math.round(tasks.reduce((s, t) => s + taskPct(t), 0) / tasks.length) : 0;

export function currentWave(tasks: Task[]) {
  const total = Math.max(0, ...tasks.map((t) => t.wave ?? 0));
  const open = tasks.filter((t) => !t.done && t.wave).map((t) => t.wave ?? 0);
  return { current: open.length ? Math.min(...open) : total, total };
}

/** Short agent badge: TL, RV, C1, C2… (plain "C" when the clone is unknown). */
export function agentLabel(kind: AgentKind, name = ""): string {
  if (kind === "tech-lead") return "TL";
  if (kind === "reviewer") return "RV";
  return "C" + (name.match(/\d+/)?.[0] ?? "");
}
