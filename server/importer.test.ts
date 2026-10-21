// @vitest-environment node
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { openDb } from "./db.ts";
import { importAll } from "./importer.ts";

it("registers projects from projects.json and dedupes usage from events and transcripts", () => {
  const db = openDb(":memory:");
  const home = mkdtempSync(join(tmpdir(), "importer-"));
  const events = join(home, "events");
  const transcripts = join(home, "transcripts");
  mkdirSync(events);
  mkdirSync(join(transcripts, "p"), { recursive: true });
  copyFileSync(
    new URL("fixtures/transcript.jsonl", import.meta.url),
    join(transcripts, "p", "s.jsonl"),
  );
  const count = () => (db.prepare("SELECT count(*) n FROM usage").get() as { n: number }).n;

  importAll(db, events, transcripts);
  expect(count()).toBe(0); // no projects.json yet: no project knows this cwd

  const project = {
    id: "dash",
    name: "Dashboard IA",
    path: "C:\\Dashboard IA",
    attachedAt: "2026-10-15T17:06:57Z",
  };
  writeFileSync(join(home, "projects.json"), JSON.stringify({ projects: [project] }));
  importAll(db, events, transcripts);
  expect(db.prepare("SELECT id, name, repo_path FROM project").all()).toEqual([
    { id: "dash", name: "Dashboard IA", repo_path: "C:\\Dashboard IA" },
  ]);
  const n = count();
  expect(n).toBeGreaterThan(0);

  // The same message as a harness `usage` event: still one row.
  const id = (db.prepare("SELECT id FROM usage LIMIT 1").get() as { id: string }).id;
  const usage = {
    v: 1,
    id: "01U",
    ts: "2026-10-18T10:00:00Z",
    harness: "0.5.0",
    project: "dash",
    session: "s",
    sprint: null,
    task: null,
    agent: "tech-lead",
    type: "usage",
    data: {
      model: "claude-opus-5-5",
      input: 1,
      output: 1,
      cache_write: 0,
      cache_read: 0,
      usd: 0,
      message_id: id,
      transcript: "main",
    },
  };
  writeFileSync(join(events, "2026-10-18.jsonl"), JSON.stringify(usage) + "\n");
  importAll(db, events, transcripts);
  expect(count()).toBe(n);
});

it("ignores a broken projects.json", () => {
  const db = openDb(":memory:");
  const home = mkdtempSync(join(tmpdir(), "importer-"));
  mkdirSync(join(home, "events"));
  writeFileSync(join(home, "projects.json"), "{oops");
  expect(() => importAll(db, join(home, "events"), join(home, "none"))).not.toThrow();
  expect(db.prepare("SELECT count(*) n FROM project").get()).toEqual({ n: 0 });
});
