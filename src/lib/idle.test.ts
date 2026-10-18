import { describe, expect, it } from "vitest";
import { splitIdle } from "./idle";

const DAY = 864e5;
const now = Date.parse("2026-10-18T12:00:00Z");
const p = (id: string, days: number) => ({
  id,
  lastActivityAt: new Date(now - days * DAY).toISOString(),
});

describe("splitIdle", () => {
  it("moves projects without activity for more than 7 days to idle", () => {
    const { active, idle } = splitIdle([p("a", 1), p("b", 8)], now);
    expect(active.map((x) => x.id)).toEqual(["a"]);
    expect(idle.map((x) => x.id)).toEqual(["b"]);
  });

  it("keeps at most 3 active, dropping the least active", () => {
    const { active, idle } = splitIdle([p("a", 3), p("b", 1), p("c", 2), p("d", 0)], now);
    expect(active.map((x) => x.id)).toEqual(["b", "c", "d"]);
    expect(idle.map((x) => x.id)).toEqual(["a"]);
  });

  it("brings promoted projects back to active, outside the cap", () => {
    const { active, idle } = splitIdle(
      [p("a", 1), p("b", 1), p("c", 1), p("z", 30)],
      now,
      new Set(["z"]),
    );
    expect(active.map((x) => x.id)).toEqual(["a", "b", "c", "z"]);
    expect(idle).toEqual([]);
  });
});
