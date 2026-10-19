// @vitest-environment node
import { describe, expect, it } from "vitest";
import { data } from "../src/data/mock.ts";
import { toEvents } from "./sample-events.ts";

const REPO = "C:/Dashboard IA";
const events = toEvents(data, REPO);
const all = Object.values(events).flat();
const ofType = (project: string, type: string) =>
  (events[project] ?? []).filter((e) => e.type === type);

describe("toEvents", () => {
  it("has one file per project", () => {
    expect(Object.keys(events).sort()).toEqual(data.projects.map((p) => p.id).sort());
  });

  it("gives every event the envelope", () => {
    for (const e of all) {
      expect(e.v).toBe(1);
      expect(Number.isNaN(Date.parse(e.ts))).toBe(false);
      expect(e.project).toBeTruthy();
      expect(e.type).toBeTruthy();
    }
  });

  it("sorts each file by ts", () => {
    for (const list of Object.values(events)) {
      const ts = list.map((e) => e.ts);
      expect(ts).toEqual([...ts].sort());
    }
  });

  it("matches mock counts per project", () => {
    for (const p of data.projects) {
      const sprints = data.sprints.filter((s) => s.projectId === p.id);
      const sprintDone = sprints.flatMap((s) => s.tasks).filter((t) => t.done).length;
      const chatDone = data.chats
        .filter((c) => c.projectId === p.id && !c.sprintId)
        .flatMap((c) => c.tasks)
        .filter((t) => t.done).length;
      expect(ofType(p.id, "sprint.plan")).toHaveLength(sprints.length);
      expect(ofType(p.id, "task.done")).toHaveLength(sprintDone + chatDone);
      expect(ofType(p.id, "doc.write")).toHaveLength(
        data.docs.filter((d) => d.projectId === p.id).length,
      );
      expect(ofType(p.id, "project.register")).toHaveLength(1);
      expect(ofType(p.id, "chat.start")).toHaveLength(
        data.chats.filter((c) => c.projectId === p.id).length,
      );
    }
  });

  it("uses the given repoPath and no usage for dashboard-ia", () => {
    expect(ofType("dashboard-ia", "project.register")[0]?.repoPath).toBe(REPO);
    expect(ofType("dashboard-ia", "usage")).toHaveLength(0);
    const mhUsage = ofType("main-harness", "usage");
    expect(mhUsage).toHaveLength(data.usage.filter((u) => u.projectId === "main-harness").length);
    expect(mhUsage[0]?.id).toMatch(/^sample-main-harness-\d{4}-\d{2}-\d{2}$/);
  });

  it("maps running steps, out-of-sprint tasks, command and limits", () => {
    const phase = ofType("dashboard-ia", "task.phase").find((e) => e.task === "T02");
    expect(phase?.step).toBe("review");
    const hook = ofType("dashboard-ia", "task.start").find((e) => e.task === "A1");
    expect(hook?.sprint).toBeUndefined();
    expect(hook?.chat).toBe("c-dash-hook");
    expect(ofType("dashboard-ia", "command")[0]?.chat).toBe(data.lastCommand.chatId);
    const limits = all.filter((e) => e.type === "limit");
    expect(limits.map((e) => e.window).sort()).toEqual(["5h", "week"]);
    expect(limits.every((e) => e.project === "*")).toBe(true);
  });
});
