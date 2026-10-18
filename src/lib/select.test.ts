import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { activeSprint, runningAgents } from "./select";

describe("select", () => {
  it("finds the active sprint of a project", () => {
    expect(activeSprint(data, "dashboard-ia")?.status).toBe("active");
    expect(activeSprint(data, "planilha-orcamento")).toBeUndefined();
  });

  it("lists agents running now in a project", () => {
    const running = runningAgents(data, "dashboard-ia");
    expect(running.length).toBeGreaterThan(0);
    expect(running.every((a) => !a.endedAt)).toBe(true);
  });
});
