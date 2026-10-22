// @vitest-environment node
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./db.ts";
import { importUsage, seedPrices, usageByDay } from "./usage.ts";

const projects = [{ id: "dash", repoPath: "c:/dashboard ia/" }];
let db: Db;
let root: string;
let file: string;

const count = () => Number(db.prepare("SELECT count(*) AS n FROM usage").get()?.n);

beforeEach(() => {
  db = openDb(":memory:");
  root = mkdtempSync(join(tmpdir(), "usage-"));
  mkdirSync(join(root, "c--Dashboard-IA"));
  file = join(root, "c--Dashboard-IA", "s1.jsonl");
  copyFileSync(new URL("fixtures/transcript.jsonl", import.meta.url), file);
});

describe("importUsage", () => {
  it("dedupes by message.id, skips other projects and lines without usage", () => {
    importUsage(db, root, projects);
    const rows = db.prepare("SELECT * FROM usage ORDER BY id").all();
    expect(rows.map((r) => r.id)).toEqual(["msg_A", "msg_C"]);
    expect(rows[0]).toMatchObject({
      project_id: "dash",
      chat_id: "s1",
      agent_id: null,
      model: "claude-opus-5-5",
      tokens_in: 100,
      tokens_out: 10,
      cache_read: 1000,
      cache_write: 200,
      at: "2026-10-16T12:00:00.000Z",
    });
    expect(rows[1]).toMatchObject({ agent_id: "a1" });
  });

  it("logs the invalid line to import_error", () => {
    importUsage(db, root, projects);
    const errs = db.prepare("SELECT line FROM import_error").all();
    expect(errs.map((e) => e.line)).toEqual(["{not json"]);
  });

  it("does not duplicate on reimport", () => {
    importUsage(db, root, projects);
    importUsage(db, root, projects);
    expect(count()).toBe(2);
  });

  it("reads subagent files in nested folders", () => {
    const sub = join(root, "c--Dashboard-IA", "s1", "subagents");
    mkdirSync(sub, { recursive: true });
    writeFileSync(
      join(sub, "agent-a9.jsonl"),
      `{"cwd":"C:\\\\Dashboard IA","sessionId":"s1","agentId":"a9","timestamp":"2026-10-16T12:00:00Z","message":{"id":"msg_D","model":"m","usage":{"input_tokens":1}}}\n`,
    );
    importUsage(db, root, projects);
    expect(count()).toBe(3);
  });

  it("waits for a partial last line", () => {
    importUsage(db, root, projects);
    const line = `{"cwd":"C:/Dashboard IA","sessionId":"s1","timestamp":"2026-10-16T13:00:00Z","message":{"id":"msg_E","model":"m","usage":{"input_tokens":1}}}`;
    appendFileSync(file, line);
    importUsage(db, root, projects);
    expect(count()).toBe(2);
    appendFileSync(file, "\n");
    importUsage(db, root, projects);
    expect(count()).toBe(3);
  });

  it("names the chat with the transcript's latest ai-title", () => {
    db.prepare(
      "INSERT INTO chat (id, project_id, title, started_at) VALUES ('s1', 'dash', 's1', '2026-10-16T12:00:00Z')",
    ).run();
    appendFileSync(file, `{"type":"ai-title","aiTitle":"Primeiro","sessionId":"s1"}\n`);
    appendFileSync(file, `{"type":"ai-title","aiTitle":"Testando status line","sessionId":"s1"}\n`);
    importUsage(db, root, projects);
    expect(db.prepare("SELECT title FROM chat WHERE id = 's1'").get()?.title).toBe(
      "Testando status line",
    );
  });

  it("returns 0 when the root does not exist", () => {
    expect(importUsage(db, join(root, "missing"), projects)).toBe(0);
  });
});

describe("prices", () => {
  it("seeds without overwriting edits", () => {
    seedPrices(db);
    db.prepare("UPDATE price SET in_per_mtok = 99 WHERE model = 'claude-opus-5-5'").run();
    seedPrices(db);
    expect(
      db.prepare("SELECT in_per_mtok AS p FROM price WHERE model = 'claude-opus-5-5'").get()?.p,
    ).toBe(99);
  });

  it("sums tokens and USD per local day, by longest model prefix", () => {
    seedPrices(db);
    importUsage(db, root, projects);
    db.prepare(
      "INSERT INTO usage (id, project_id, at, model, tokens_in) VALUES ('x', 'dash', '2026-10-16T12:00:00Z', 'unknown-model', 5)",
    ).run();
    // opus: 100*4 + 10*20 + 1000*0.2 + 200*5 = 1800 / 1e6; haiku 4.5: 1e6 * 1 / 1e6; unknown: 0
    expect(usageByDay(db, "dash")).toEqual([
      { projectId: "dash", date: "2026-10-16", tokens: 1_001_315, usd: expect.closeTo(1.0018, 9) },
    ]);
    expect(usageByDay(db)).toHaveLength(1);
  });

  it("splits each day by sprint window (edges included) and leaves the rest outside a sprint", () => {
    const sprint = db.prepare(
      "INSERT INTO sprint (project_id, id, title, status, started_at, closed_at) VALUES ('dash', ?, 't', 's', ?, ?)",
    );
    sprint.run("S01", "2026-10-16T10:00:00Z", "2026-10-16T12:00:00Z");
    sprint.run("S02", "2026-10-16T14:00:00Z", null);
    const use = db.prepare(
      "INSERT INTO usage (id, project_id, at, model, tokens_in) VALUES (?, 'dash', ?, 'm', ?)",
    );
    use.run("a", "2026-10-16T10:00:00Z", 1); // S01 start edge
    use.run("b", "2026-10-16T12:00:00Z", 2); // S01 close edge
    use.run("c", "2026-10-16T13:00:00Z", 4); // between sprints
    use.run("d", "2026-10-16T15:00:00Z", 8); // S02, still open
    const rows = usageByDay(db, "dash", Date.parse("2026-10-16T16:00:00Z"));
    expect(rows.map((r) => [r.sprintId, r.tokens])).toEqual([
      [undefined, 4],
      ["S01", 3],
      ["S02", 8],
    ]);
  });
});
