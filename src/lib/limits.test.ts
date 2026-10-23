import { describe, expect, it } from "vitest";
import { formatTime, formatWeekday } from "./time";
import { resetLabel } from "./limits";

const now = Date.parse("2026-10-22T15:00:00Z");
const iso = (min: number) => new Date(now + min * 60_000).toISOString();

describe("resetLabel", () => {
  it("counts down in hh:mm and gives the reset time for the 5 h window", () => {
    expect(resetLabel(iso(100), now, false)).toEqual({
      countdown: "renova em 01:40",
      at: `às ${formatTime(iso(100))}`,
    });
  });

  it("past 24 h counts days as ND-hh:mm", () => {
    expect(resetLabel(iso(1440 + 3 * 60 + 5), now, false).countdown).toBe("renova em 1D-03:05");
    expect(resetLabel(iso(2 * 1440), now, false).countdown).toBe("renova em 2D-00:00");
    expect(resetLabel(iso(1439), now, false).countdown).toBe("renova em 23:59");
  });

  it("weekly: the time carries the weekday", () => {
    const at = iso(3 * 1440 + 18 * 60 + 10);
    expect(resetLabel(at, now, true)).toEqual({
      countdown: "renova em 3D-18:10",
      at: `${formatWeekday(at)} ${formatTime(at)}`,
    });
  });

  it("never counts below zero", () => {
    expect(resetLabel(iso(-5), now, false).countdown).toBe("renova em 00:00");
  });

  it("without a reset time says 'sem dado'", () => {
    expect(resetLabel(undefined, now, true)).toEqual({ countdown: "sem dado", at: "" });
  });
});
