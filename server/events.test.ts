// @vitest-environment node
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./db.ts";
import { importEvents } from "./events.ts";

const ev = (type: string, ts: string, extra: object = {}, project = "p1") =>
  JSON.stringify({ v: 1, ts, project, type, ...extra }) + "\n";

let db: Db;
let dir: string;
const file = () => join(dir, "p1.jsonl");
const all = (sql: string) => db.prepare(sql).all();
const one = (sql: string) => db.prepare(sql).get();

beforeEach(() => {
  db = openDb(":memory:");
  dir = mkdtempSync(join(tmpdir(), "events-"));
});

describe("importEvents", () => {
  it("applies project, sprint and task events", () => {
    writeFileSync(
      file(),
      ev("project.register", "2026-10-18T10:00:00Z", { name: "P 1", repoPath: "C:/p1" }) +
        ev("sprint.plan", "2026-10-18T10:05:00Z", {
          sprint: "S01",
          title: "First",
          plannedMin: 60,
          tasks: [
            {
              id: "T01",
              title: "Do it",
              wave: 1,
              agent: "clone",
              plan: { start: 0, duration: 30, deps: [] },
            },
          ],
        }) +
        ev("sprint.open", "2026-10-18T10:10:00Z", { sprint: "S01", chat: "c1" }) +
        ev("task.start", "2026-10-18T10:11:00Z", {
          sprint: "S01",
          task: "T01",
          chat: "c1",
          agent: "clone",
        }) +
        ev("task.phase", "2026-10-18T10:20:00Z", { sprint: "S01", task: "T01", step: "review" }) +
        ev("task.review", "2026-10-18T10:25:00Z", {
          sprint: "S01",
          task: "T01",
          result: "fail",
          round: 1,
          note: "x",
        }),
    );
    expect(importEvents(db, dir)).toBe(6);
    expect(one("SELECT name, repo_path, last_activity_at FROM project")).toEqual({
      name: "P 1",
      repo_path: "C:/p1",
      last_activity_at: "2026-10-18T10:25:00Z",
    });
    expect(one("SELECT status, started_at, planned_min FROM sprint")).toEqual({
      status: "active",
      started_at: "2026-10-18T10:10:00Z",
      planned_min: 60,
    });
    expect(one("SELECT title, chat_id, steps, review, agent_kind, plan_deps FROM task")).toEqual({
      title: "Do it",
      chat_id: "c1",
      steps: 3,
      review: "fail",
      agent_kind: "clone",
      plan_deps: "[]",
    });
  });

  it("accepts events in any order and never duplicates on reimport", () => {
    writeFileSync(
      file(),
      ev("task.done", "2026-10-18T11:00:00Z", { sprint: "S01", task: "T02" }) +
        ev("task.start", "2026-10-18T10:00:00Z", {
          sprint: "S01",
          task: "T02",
          title: "Late start",
        }),
    );
    importEvents(db, dir);
    db.exec("DELETE FROM import_cursor");
    importEvents(db, dir);
    expect(all("SELECT title, done, started_at, ended_at FROM task")).toEqual([
      {
        title: "Late start",
        done: 1,
        started_at: "2026-10-18T10:00:00Z",
        ended_at: "2026-10-18T11:00:00Z",
      },
    ]);
    expect(one("SELECT count(*) n FROM event")).toEqual({ n: 2 });
  });

  it("logs invalid lines and keeps importing", () => {
    writeFileSync(
      file(),
      "not json\n" +
        JSON.stringify({ v: 1, ts: "x", project: "p1", type: "command" }) +
        "\n" +
        ev("task.start", "2026-10-18T10:00:00Z", { task: "A1" }) + // no sprint and no chat
        ev("command", "2026-10-18T10:00:00Z", { chat: "c1" }),
    );
    expect(importEvents(db, dir)).toBe(4);
    expect(one("SELECT count(*) n FROM import_error")).toEqual({ n: 3 });
    expect(one("SELECT count(*) n FROM event")).toEqual({ n: 1 });
  });

  it("waits for a partial last line", () => {
    const line = ev("command", "2026-10-18T10:00:00Z", { chat: "c1" });
    writeFileSync(file(), line.slice(0, 10));
    expect(importEvents(db, dir)).toBe(0);
    appendFileSync(file(), line.slice(10));
    expect(importEvents(db, dir)).toBe(1);
    expect(importEvents(db, dir)).toBe(0);
  });

  it("keeps the newest project.status and limit even when older ones arrive later", () => {
    writeFileSync(
      file(),
      ev("project.status", "2026-10-18T12:00:00Z", {
        whereStopped: "new",
        phase: { label: "Plano", tone: "warn" },
      }) +
        ev("project.status", "2026-10-18T09:00:00Z", { whereStopped: "old" }) +
        ev(
          "limit",
          "2026-10-18T12:00:00Z",
          { window: "5h", pct: 62, resetsAt: "2026-10-18T15:00:00Z" },
          "*",
        ) +
        ev(
          "limit",
          "2026-10-18T09:00:00Z",
          { window: "5h", pct: 10, resetsAt: "2026-10-18T10:00:00Z" },
          "*",
        ),
    );
    importEvents(db, dir);
    expect(one("SELECT where_stopped, phase_json FROM project WHERE id = 'p1'")).toEqual({
      where_stopped: "new",
      phase_json: '{"label":"Plano","tone":"warn"}',
    });
    expect(one("SELECT pct FROM limit_window WHERE window = '5h'")).toEqual({ pct: 62 });
    expect(one("SELECT count(*) n FROM project WHERE id = '*'")).toEqual({ n: 0 });
  });

  it("stores chats, agents, ad hoc tasks, docs and usage", () => {
    writeFileSync(
      file(),
      ev("chat.start", "2026-10-18T10:00:00Z", { chat: "c1", title: "hook lento" }) +
        ev("agent.start", "2026-10-18T10:00:00Z", {
          chat: "c1",
          agent: "a1",
          kind: "tech-lead",
          name: "Tech Lead",
        }) +
        ev("agent.context", "2026-10-18T10:05:00Z", { chat: "c1", agent: "a1", pct: 21 }) +
        ev("task.start", "2026-10-18T10:01:00Z", {
          chat: "c1",
          task: "A1",
          title: "Fix hook",
          agent: "tech-lead",
        }) +
        ev("doc.write", "2026-10-18T10:02:00Z", {
          kind: "adr",
          id: "0001",
          title: "ADR",
          path: "docs/adr/1.md",
          markdown: "# ADR",
        }) +
        ev("usage", "2026-10-18T10:03:00Z", {
          id: "u1",
          chat: "c1",
          model: "m",
          tokensIn: 5,
          tokensOut: 1,
          cacheRead: 0,
          cacheWrite: 0,
        }) +
        ev("chat.end", "2026-10-18T10:30:00Z", { chat: "c1" }),
    );
    importEvents(db, dir);
    expect(one("SELECT title, ended_at FROM chat")).toEqual({
      title: "hook lento",
      ended_at: "2026-10-18T10:30:00Z",
    });
    expect(one("SELECT kind, context_pct FROM agent")).toEqual({
      kind: "tech-lead",
      context_pct: 21,
    });
    expect(one("SELECT scope, sprint_id FROM task")).toEqual({ scope: "chat:c1", sprint_id: null });
    expect(one("SELECT markdown, date FROM doc")).toEqual({
      markdown: "# ADR",
      date: "2026-10-18T10:02:00Z",
    });
    expect(one("SELECT tokens_in, project_id FROM usage")).toEqual({
      tokens_in: 5,
      project_id: "p1",
    });
  });

  it("rejects malformed fields that would break the screens", () => {
    const bad = [
      ev("project.status", "2026-10-18T10:00:00Z", { alerts: {} }),
      ev("project.status", "2026-10-18T10:00:00Z", {
        alerts: [{ tone: "ok", title: "t", detail: "d" }],
      }),
      ev("project.status", "2026-10-18T10:00:00Z", { phase: { label: 1, tone: "run" } }),
      ev("project.status", "2026-10-18T10:00:00Z", { nextStep: "go" }),
      ev("project.event", "2026-10-18T10:00:00Z", { kind: "ok", text: {} }),
      ev("sprint.plan", "2026-10-18T10:00:00Z", {
        sprint: "S01",
        tasks: [{ id: "T01", plan: { deps: "T00" } }],
      }),
      ev("limit", "2026-10-18T10:00:00Z", { window: "5h", pct: "abc" }, "*"),
    ];
    writeFileSync(file(), bad.join(""));
    importEvents(db, dir);
    expect(one("SELECT count(*) n FROM import_error")).toEqual({ n: bad.length });
    expect(one("SELECT count(*) n FROM event")).toEqual({ n: 0 });
  });

  it("reads a rewritten file again from the start", () => {
    writeFileSync(file(), ev("command", "2026-10-18T10:00:00Z", { chat: "c1" }));
    importEvents(db, dir);
    writeFileSync(file(), ev("command", "2026-10-18T11:00:00Z", { chat: "c2" }));
    expect(importEvents(db, dir)).toBe(1);
    expect(one("SELECT count(*) n FROM event")).toEqual({ n: 2 });
  });

  it("returns 0 when the folder does not exist", () => {
    expect(importEvents(db, join(dir, "missing"))).toBe(0);
  });
});
