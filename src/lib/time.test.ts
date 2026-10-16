import { describe, expect, it } from "vitest";
import { durationMs, formatDuration, formatTime } from "./time";

describe("time", () => {
  const start = "2026-10-16T20:00:00Z";

  it("measures finished durations", () => {
    expect(durationMs(start, "2026-10-16T21:05:00Z")).toBe(65 * 60_000);
  });

  it("measures running durations up to now", () => {
    expect(durationMs(start, undefined, Date.parse("2026-10-16T20:30:00Z"))).toBe(30 * 60_000);
  });

  it("formats durations", () => {
    expect(formatDuration(30_000)).toBe("< 1 min");
    expect(formatDuration(45 * 60_000)).toBe("45 min");
    expect(formatDuration(60 * 60_000)).toBe("1 h");
    expect(formatDuration(65 * 60_000)).toBe("1 h 05 min");
  });

  it("formats time in Brasília", () => {
    expect(formatTime(start)).toBe("17:00");
  });
});
