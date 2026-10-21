// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { buildData } from "./data.ts";
import { openDb, type Db } from "./db.ts";
import { importEvent } from "./events.ts";
import { seedPrices } from "./usage.ts";

let db: Db;
beforeEach(() => {
  db = openDb(":memory:");
  seedPrices(db);
});

let seq = 0;
const ev = (type: string, ts: string, data: object = {}, env: object = {}) =>
  importEvent(
    db,
    JSON.stringify({
      v: 1,
      id: `e${++seq}`,
      ts,
      project: "p1",
      session: null,
      sprint: null,
      task: null,
      agent: null,
      type,
      data,
      ...env,
    }),
  );
const usage = (ts: string, id: string, input: number, output = 0) =>
  ev("usage", ts, {
    model: "claude-opus-5-5",
    input,
    output,
    cache_write: 0,
    cache_read: 0,
    usd: null,
    message_id: id,
    transcript: "main",
  });

describe("buildData", () => {
  it("estimates the 5 h limit from spend and leaves the week empty without limit events", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    // 1 Mtok of opus input = US$ 4; h5Usd = 17 → 24%
    usage("2026-10-18T11:00:00Z", "u1", 1_000_000);
    usage("2026-10-18T05:00:00Z", "u2", 9_000_000);
    const { limits } = buildData(db, now);
    expect(limits.h5).toEqual({ pct: 24, estimated: true });
    expect(limits.week).toBeUndefined();
  });

  it("ignores an expired limit event", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    db.exec(
      "INSERT INTO limit_window VALUES ('5h', 90, '2026-10-18T10:00:00Z', '2026-10-18T05:00:00Z')",
    );
    expect(buildData(db, now).limits.h5.estimated).toBe(true);
  });

  it("reports promoted projects and sprint spend", () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 1 }, { sprint: "S01" });
    usage("2026-10-18T11:00:00Z", "u1", 0, 100_000);
    db.exec("UPDATE project SET promoted = 1");
    const d = buildData(db, Date.parse("2026-10-18T12:00:00Z"));
    expect(d.projects[0]?.promoted).toBe(true);
    expect(d.sprints[0]?.usd).toBeCloseTo(2);
  });
});

