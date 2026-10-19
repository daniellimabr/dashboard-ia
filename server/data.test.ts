// @vitest-environment node
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { toEvents } from "../scripts/sample-events.ts";
import { data as mock } from "../src/data/mock.ts";
import { buildData } from "./data.ts";
import { openDb, type Db } from "./db.ts";
import { importEvent, importEvents } from "./events.ts";
import { seedPrices } from "./usage.ts";

let db: Db;
beforeEach(() => {
  db = openDb(":memory:");
  seedPrices(db);
});

const ev = (type: string, ts: string, extra: object = {}, project = "p1") =>
  importEvent(db, JSON.stringify({ v: 1, ts, project, type, ...extra }));

describe("buildData", () => {
  it("round-trips the sample events back to the mock's shape", () => {
    const dir = mkdtempSync(join(tmpdir(), "data-"));
    for (const [id, events] of Object.entries(toEvents(mock, "C:/Dashboard IA")))
      writeFileSync(join(dir, `${id}.jsonl`), events.map((e) => JSON.stringify(e) + "\n").join(""));
    importEvents(db, dir);
    expect(db.prepare("SELECT count(*) n FROM import_error").get()).toEqual({ n: 0 });

    const d = buildData(db);
    const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();
    expect(ids(d.projects)).toEqual(ids(mock.projects));
    expect(ids(d.chats)).toEqual(ids(mock.chats));
    expect(d.docs.length).toBe(mock.docs.length);
    expect(d.lastCommand).toEqual(mock.lastCommand);
    expect(d.limits.h5.pct).toBe(mock.limits.h5.pct);
    expect(d.limits.week?.pct).toBe(mock.limits.week?.pct);
    for (const s of mock.sprints) {
      const got = d.sprints.find((x) => x.projectId === s.projectId && x.id === s.id);
      expect(got?.status).toBe(s.status);
      expect(got?.tasks.map((t) => [t.id, t.done])).toEqual(s.tasks.map((t) => [t.id, t.done]));
    }
    const dash = d.projects.find((p) => p.id === "dashboard-ia");
    const mockDash = mock.projects.find((p) => p.id === "dashboard-ia");
    expect(dash?.phase).toEqual(mockDash?.phase);
    expect(dash?.alerts).toEqual(mockDash?.alerts);
    expect(dash?.events?.length).toBe(mockDash?.events?.length);
    expect(dash?.backlog).toBe(mockDash?.backlog);
  });

  it("estimates the 5 h limit from spend and leaves the week empty without limit events", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    ev("project.register", "2026-10-18T10:00:00Z", { name: "P", repoPath: "C:/p" });
    // 1 Mtok of opus input = US$ 4; h5Usd = 17 → 24%
    ev("usage", "2026-10-18T11:00:00Z", {
      id: "u1",
      model: "claude-opus-5-5",
      tokensIn: 1_000_000,
    });
    ev("usage", "2026-10-18T05:00:00Z", {
      id: "u2",
      model: "claude-opus-5-5",
      tokensIn: 9_000_000,
    });
    const { limits } = buildData(db, now);
    expect(limits.h5).toEqual({ pct: 24, estimated: true });
    expect(limits.week).toBeUndefined();
  });

  it("ignores an expired limit event", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    ev(
      "limit",
      "2026-10-18T05:00:00Z",
      { window: "5h", pct: 90, resetsAt: "2026-10-18T10:00:00Z" },
      "*",
    );
    expect(buildData(db, now).limits.h5.estimated).toBe(true);
  });

  it("reports promoted projects and sprint spend", () => {
    ev("project.register", "2026-10-18T10:00:00Z", { name: "P", repoPath: "C:/p" });
    ev("sprint.open", "2026-10-18T10:00:00Z", { sprint: "S01" });
    ev("usage", "2026-10-18T11:00:00Z", { id: "u1", model: "claude-opus-5-5", tokensOut: 100_000 });
    db.exec("UPDATE project SET promoted = 1");
    const d = buildData(db, Date.parse("2026-10-18T12:00:00Z"));
    expect(d.projects[0]?.promoted).toBe(true);
    expect(d.sprints[0]?.usd).toBeCloseTo(2);
  });
});
