import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { openDb } from "./db.ts";

it("rebuilds a half-migrated database (old version, no project table)", () => {
  const file = join(mkdtempSync(join(tmpdir(), "dash-")), "d.db");
  const old = new DatabaseSync(file);
  old.exec("CREATE TABLE task (id TEXT); PRAGMA user_version = 7");
  old.close();
  const db = openDb(file);
  expect(db.prepare("SELECT count(*) AS n FROM project").get()).toEqual({ n: 0 });
});

function oldDb(sql: string) {
  const file = join(mkdtempSync(join(tmpdir(), "dash-")), "d.db");
  const old = new DatabaseSync(file);
  old.exec(`${sql}; PRAGMA user_version = 7`);
  old.close();
  return file;
}

it("keeps the old rows on a version bump (transcripts already gone: nothing to re-import)", () => {
  const file = oldDb(`
    CREATE TABLE project (id TEXT PRIMARY KEY, name TEXT NOT NULL, last_activity_at TEXT NOT NULL);
    INSERT INTO project VALUES ('dash', 'Dash', '2026-10-01');
    CREATE TABLE chat (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, started_at TEXT NOT NULL);
    INSERT INTO chat VALUES ('c1', 'dash', 'Old chat', '2026-10-01');
    CREATE TABLE usage (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, at TEXT NOT NULL, model TEXT NOT NULL, tokens_in INTEGER);
    CREATE INDEX usage_project_at ON usage(project_id);
    INSERT INTO usage VALUES ('u1', 'dash', '2026-10-01', 'opus', 42);
    CREATE TABLE gone (x TEXT);
  `);
  const db = openDb(file);
  expect(db.prepare("SELECT id, title FROM chat").all()).toEqual([{ id: "c1", title: "Old chat" }]);
  expect(db.prepare("SELECT id, tokens_in, agent_type FROM usage").all()).toEqual([
    { id: "u1", tokens_in: 42, agent_type: null },
  ]);
  // new column gets its default
  expect(db.prepare("SELECT promoted FROM project").get()).toEqual({ promoted: 0 });
  expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'gone'").get()).toBeUndefined();
  // the index is rebuilt on the new table, on the new columns
  expect(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'usage_project_at'").get()).toEqual(
    {
      sql: "CREATE INDEX usage_project_at ON usage(project_id, at)",
    },
  );
});

it("sets sprint.started_at to the first sprint.open on a version bump", () => {
  const file = oldDb(`
    CREATE TABLE sprint (project_id TEXT NOT NULL, id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT);
    INSERT INTO sprint VALUES ('p', 'S01', 't', 'open', '2026-10-28T19:18:24Z'), ('p', 'S02', 't', 'open', '2026-10-28T10:00:00Z');
    CREATE TABLE event (rowid INTEGER PRIMARY KEY, project_id TEXT NOT NULL, at TEXT NOT NULL, type TEXT NOT NULL, chat_id TEXT, body TEXT NOT NULL, hash TEXT NOT NULL UNIQUE);
    INSERT INTO event (project_id, at, type, body, hash) VALUES
      ('p', '2026-10-28T12:15:02Z', 'sprint.open', '{"sprint":"S01"}', 'a'),
      ('p', '2026-10-28T19:18:24Z', 'sprint.open', '{"sprint":"S01"}', 'b');
  `);
  const db = openDb(file);
  // S01 goes back to its first open; S02 has no event and stays as it was
  expect(db.prepare("SELECT id, started_at FROM sprint ORDER BY id").all()).toEqual([
    { id: "S01", started_at: "2026-10-28T12:15:02Z" },
    { id: "S02", started_at: "2026-10-28T10:00:00Z" },
  ]);
});

it("rolls back and keeps the old database when a row does not fit the new schema", () => {
  const file = oldDb(
    "CREATE TABLE chat (id TEXT, title TEXT); INSERT INTO chat VALUES ('c1', 'x')",
  );
  expect(() => openDb(file)).toThrow();
  const old = new DatabaseSync(file);
  expect(old.prepare("PRAGMA user_version").get()).toEqual({ user_version: 7 });
  expect(old.prepare("SELECT * FROM chat").all()).toEqual([{ id: "c1", title: "x" }]);
  expect(old.prepare("SELECT count(*) AS n FROM sqlite_master").get()).toEqual({ n: 1 });
});
