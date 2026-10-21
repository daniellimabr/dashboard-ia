// @vitest-environment node
import { appendFileSync, copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./db.ts";
import { importEvents } from "./events.ts";

let db: Db;
let dir: string;
beforeEach(() => {
  db = openDb(":memory:");
  dir = mkdtempSync(join(tmpdir(), "events-"));
  copyFileSync(
    new URL("fixtures/harness-events.jsonl", import.meta.url),
    join(dir, "2026-10-18.jsonl"),
  );
});

const all = (sql: string) => db.prepare(sql).all();
const one = (sql: string) => db.prepare(sql).get();

describe("importEvents (harness contract v1)", () => {
  it("applies sprint, task and review events", () => {
    importEvents(db, dir);
    expect(
      one(
        "SELECT status, approved_at, started_at, plan_path, task_count, feedback_rounds FROM sprint WHERE project_id = 'dash'",
      ),
    ).toEqual({
      status: "active",
      approved_at: "2026-10-18T10:02:00Z",
      started_at: "2026-10-18T10:03:00Z",
      plan_path: "docs/sprints/S01-plan.md",
      task_count: 2,
      feedback_rounds: 1,
    });
    expect(
      all(
        "SELECT id, done, steps, review, review_round, agent_kind, chat_id FROM task ORDER BY id",
      ),
    ).toEqual([
      {
        id: "T01",
        done: 0,
        steps: 1,
        review: "fail",
        review_round: 1,
        agent_kind: "tech-lead",
        chat_id: "s1",
      },
      {
        id: "T02",
        done: 1,
        steps: 5,
        review: null,
        review_round: 0,
        agent_kind: "clone",
        chat_id: "s1",
      },
    ]);
    expect(one("SELECT status, closed_at FROM sprint WHERE project_id = 'other'")).toEqual({
      status: "closed",
      closed_at: "2026-10-18T10:15:00Z",
    });
  });

  it("derives chats and agents from each session", () => {
    importEvents(db, dir);
    expect(
      all("SELECT id, project_id, sprint_id, started_at, ended_at FROM chat ORDER BY id"),
    ).toEqual([
      {
        id: "s1",
        project_id: "dash",
        sprint_id: "S01",
        started_at: "2026-10-18T10:01:00Z",
        ended_at: "2026-10-18T10:14:00Z",
      },
      {
        id: "s2",
        project_id: "other",
        sprint_id: "S09",
        started_at: "2026-10-18T10:15:00Z",
        ended_at: null,
      },
    ]);
    expect(
      all(
        "SELECT id, kind, name, context_pct, started_at, ended_at FROM agent WHERE chat_id = 's1' ORDER BY id",
      ),
    ).toEqual([
      {
        id: "s1:clone",
        kind: "clone",
        name: "clone",
        context_pct: null,
        started_at: "2026-10-18T10:06:00Z",
        ended_at: "2026-10-18T10:14:00Z",
      },
      {
        id: "s1:reviewer",
        kind: "reviewer",
        name: "Reviewer",
        context_pct: null,
        started_at: "2026-10-18T10:08:00Z",
        ended_at: "2026-10-18T10:14:00Z",
      },
      {
        id: "s1:tech-lead",
        kind: "tech-lead",
        name: "Tech Lead",
        context_pct: 50,
        started_at: "2026-10-18T10:02:00Z",
        ended_at: "2026-10-18T10:14:00Z",
      },
    ]);
  });

  it("reads plugin subagent names: main-harness:reviewer is the Reviewer, main-harness:tech-lead a clone", () => {
    const line = (id: string, agent: string) =>
      JSON.stringify({
        v: 1,
        id,
        ts: "2026-10-18T11:00:00Z",
        harness: "0.5.0",
        project: "dash",
        session: "s9",
        sprint: null,
        task: null,
        agent,
        type: "usage",
        data: { message_id: id },
      });
    writeFileSync(
      join(dir, "2026-10-18.jsonl"),
      [line("m1", "main-harness:reviewer"), line("m2", "main-harness:tech-lead"), ""].join("\n"),
    );
    importEvents(db, dir);
    expect(all("SELECT id, kind, name FROM agent ORDER BY id")).toEqual([
      { id: "s9:main-harness:reviewer", kind: "reviewer", name: "Reviewer" },
      { id: "s9:main-harness:tech-lead", kind: "clone", name: "Clone" },
    ]);
  });

  it("keys usage by message_id and never duplicates", () => {
    importEvents(db, dir);
    expect(all("SELECT id, project_id, chat_id, model, tokens_in FROM usage")).toEqual([
      {
        id: "msg_1",
        project_id: "dash",
        chat_id: "s1",
        model: "claude-opus-5-5",
        tokens_in: 1000000,
      },
    ]);
  });

  it("logs invalid lines, counts unknown versions and keeps every event in the log", () => {
    expect(importEvents(db, dir)).toBe(18);
    expect(all("SELECT line, error FROM import_error")).toEqual([
      { line: "not json", error: expect.any(String) },
    ]);
    expect(one("SELECT count(*) n FROM import_skip")).toEqual({ n: 1 });
    // 15 distinct v1 ids (one repeated); the v2 line and the bad line are not events
    expect(one("SELECT count(*) n FROM event")).toEqual({ n: 15 });
    expect(one("SELECT count(*) n FROM event WHERE type = 'harness.request'")).toEqual({ n: 1 });
  });

  it("reads a new daily file and new lines without reimporting", () => {
    importEvents(db, dir);
    expect(importEvents(db, dir)).toBe(0);
    const line = {
      v: 1,
      id: "01B",
      ts: "2026-10-19T09:00:00Z",
      harness: "0.5.0",
      project: "dash",
      session: "s3",
      sprint: "S01",
      task: "T01",
      agent: "tech-lead",
      type: "task.done",
      data: { duration_s: 60 },
    };
    writeFileSync(join(dir, "2026-10-19.jsonl"), JSON.stringify(line) + "\n");
    expect(importEvents(db, dir)).toBe(1);
    expect(one("SELECT done FROM task WHERE id = 'T01'")).toEqual({ done: 1 });
    appendFileSync(join(dir, "2026-10-19.jsonl"), '{"v":1');
    expect(importEvents(db, dir)).toBe(0); // partial last line waits
  });

  it("rejects an envelope without id or data object", () => {
    writeFileSync(
      join(dir, "2026-10-18.jsonl"),
      [
        { v: 1, ts: "2026-10-18T10:00:00Z", project: "p", type: "task.done", data: {} },
        { v: 1, id: "x", ts: "2026-10-18T10:00:00Z", project: "p", type: "task.done", data: 3 },
      ]
        .map((e) => JSON.stringify(e) + "\n")
        .join(""),
    );
    importEvents(db, dir);
    expect(one("SELECT count(*) n FROM import_error")).toEqual({ n: 2 });
  });

  it("returns 0 when the folder does not exist", () => {
    expect(importEvents(db, join(dir, "nope"))).toBe(0);
  });
});
