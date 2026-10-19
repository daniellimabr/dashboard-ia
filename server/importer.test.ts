// @vitest-environment node
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { openDb } from "./db.ts";
import { importAll } from "./importer.ts";

it("reads transcripts again when a repo is registered after they were first seen", () => {
  const db = openDb(":memory:");
  const root = mkdtempSync(join(tmpdir(), "importer-"));
  const events = join(root, "events");
  const transcripts = join(root, "transcripts");
  mkdirSync(events);
  mkdirSync(join(transcripts, "p"), { recursive: true });
  copyFileSync(
    new URL("fixtures/transcript.jsonl", import.meta.url),
    join(transcripts, "p", "s.jsonl"),
  );
  const count = () => (db.prepare("SELECT count(*) n FROM usage").get() as { n: number }).n;

  importAll(db, events, transcripts);
  expect(count()).toBe(0); // no project knows this cwd yet

  const register = {
    v: 1,
    ts: "2026-10-18T10:00:00Z",
    project: "dash",
    type: "project.register",
    name: "D",
    repoPath: "C:/Dashboard IA",
  };
  writeFileSync(join(events, "dash.jsonl"), JSON.stringify(register) + "\n");
  importAll(db, events, transcripts);
  const n = count();
  expect(n).toBeGreaterThan(0);

  importAll(db, events, transcripts);
  expect(count()).toBe(n);
});
