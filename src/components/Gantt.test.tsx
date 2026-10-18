import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Task } from "../data/types";
import { formatTime } from "../lib/time";
import { Gantt } from "./Gantt";

// Real clock: T01 14:00–14:15, T02 running since 14:15, now 14:30.
// T03 (after T01+T02) forecast 14:30–15:00, T04 (after T03) forecast 15:00–15:15.
const iso = (hm: string) => `2026-10-18T${hm}:00Z`;
const now = Date.parse(iso("14:30"));
const tasks: Task[] = [
  {
    id: "T01",
    title: "a",
    done: true,
    startedAt: iso("14:00"),
    endedAt: iso("14:15"),
    plan: { start: 0, duration: 15, deps: [] },
  },
  {
    id: "T02",
    title: "b",
    done: false,
    startedAt: iso("14:15"),
    steps: 2,
    plan: { start: 15, duration: 15, deps: ["T01"] },
  },
  { id: "T03", title: "c", done: false, plan: { start: 30, duration: 30, deps: ["T01", "T02"] } },
  { id: "T04", title: "d", done: false, plan: { start: 60, duration: 15, deps: ["T03"] } },
];
const pct = (el: HTMLElement, prop: "left" | "width") => parseFloat(el.style[prop]);

describe("Gantt", () => {
  it("places started tasks by real time, with the % beside the id", () => {
    render(<Gantt tasks={tasks} now={now} />);
    expect(screen.getByText("T01").nextElementSibling?.textContent).toBe("100%");
    expect(screen.getByText("T02").nextElementSibling?.textContent).toBe("40%");
    const t1 = screen.getByTitle("T01 · 100%");
    expect(pct(t1, "left")).toBeCloseTo(0);
    expect(pct(t1, "width")).toBeCloseTo(20);
    const t2 = screen.getByTitle("T02 · 40%"); // running: ends now
    expect(pct(t2, "left")).toBeCloseTo(20);
    expect(pct(t2, "width")).toBeCloseTo(20);
  });

  it("forecasts unstarted tasks after their dependencies, dashed", () => {
    render(<Gantt tasks={tasks} now={now} />);
    const t3 = screen.getByTitle("T03 · previsão 30 min");
    expect(t3.dataset.status).toBe("todo");
    expect(t3.style.background).toBe("transparent");
    expect(pct(t3, "left")).toBeCloseTo(40);
    expect(pct(t3, "width")).toBeCloseTo(40);
    expect(pct(screen.getByTitle("T04 · previsão 15 min"), "left")).toBeCloseTo(80);
    screen.getByText("tracejado = previsão");
  });

  it("forecasts everything from now when nothing started", () => {
    const planned = tasks
      .slice(2)
      .map((t) => ({ ...t, plan: { start: 0, duration: t.plan?.duration ?? 0, deps: [] } }));
    render(<Gantt tasks={planned} now={now} />);
    expect(pct(screen.getByTitle("T03 · previsão 30 min"), "left")).toBeCloseTo(0);
    expect(pct(screen.getByTitle("T04 · previsão 15 min"), "left")).toBeCloseTo(0);
  });

  it("draws one dashed path per dependency", () => {
    const { container } = render(<Gantt tasks={tasks} now={now} />);
    expect(container.querySelectorAll("svg path")).toHaveLength(4);
  });

  it("labels the axis with round clock times", () => {
    render(<Gantt tasks={tasks} now={now} />);
    const labels = screen.getAllByTestId("tick").map((t) => t.textContent);
    expect(labels).toEqual(
      ["14:00", "14:15", "14:30", "14:45", "15:00", "15:15"].map((hm) => formatTime(iso(hm))),
    );
  });

  it("shows 'agora' only when live", () => {
    const { container, rerender } = render(<Gantt tasks={tasks} now={now} />);
    expect(container.querySelector("[data-now]")).toBeNull();
    rerender(<Gantt tasks={tasks} now={now} live />);
    expect(pct(container.querySelector("[data-now]") as HTMLElement, "left")).toBeCloseTo(40);
  });
});
