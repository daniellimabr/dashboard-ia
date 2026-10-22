import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Task } from "../data/types";
import { Gantt, idleGaps, Meter } from "./ui";

const MIN = 60_000;
const T0 = Date.parse("2026-10-22T15:00:00Z");
const tasks: Task[] = [
  {
    id: "T01",
    title: "a",
    done: true,
    startedAt: new Date(T0).toISOString(),
    endedAt: new Date(T0 + 10 * MIN).toISOString(),
    plan: { start: 0, duration: 10, deps: [] },
  },
  {
    id: "T02",
    title: "b",
    done: false,
    startedAt: new Date(T0 + 15 * MIN).toISOString(),
    plan: { start: 10, duration: 10, deps: [] },
  },
];

describe("ui", () => {
  it("Meter without a value reads 'sem dado'", () => {
    render(<Meter label="Semanal" />);
    expect(screen.getByRole("meter", { name: "Semanal" }).getAttribute("aria-valuetext")).toBe(
      "sem dado",
    );
  });

  it("idleGaps finds stretches of 1 min or more with no task running", () => {
    expect(idleGaps(tasks, T0, T0 + 20 * MIN)).toEqual([
      { kind: "idle", start: T0 + 10 * MIN, end: T0 + 15 * MIN },
    ]);
  });

  it("Gantt draws the pause lane and names only the kinds present", () => {
    render(
      <Gantt
        tasks={tasks}
        start={new Date(T0).toISOString()}
        now={T0 + 18 * MIN}
        waits={[{ kind: "reply", start: T0 + 11 * MIN, end: T0 + 13 * MIN }]}
      />,
    );
    screen.getByText("Pausas");
    const key = screen.getByRole("list", { name: "Legenda do plano" });
    expect(key.textContent).toContain("Aguardando resposta");
    expect(key.textContent).not.toContain("Aguardando limite");
    expect(document.body.textContent).not.toMatch(/exemplo/i);
  });
});
