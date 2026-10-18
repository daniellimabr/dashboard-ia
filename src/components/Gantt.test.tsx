import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Task } from "../data/types";
import { Gantt } from "./Gantt";

const tasks: Task[] = [
  { id: "T01", title: "a", done: true, plan: { start: 0, duration: 15, deps: [] } },
  {
    id: "T02",
    title: "b",
    done: false,
    startedAt: "2026-10-18T14:00:00Z",
    steps: 2,
    plan: { start: 15, duration: 15, deps: ["T01"] },
  },
  { id: "T03", title: "c", done: false, plan: { start: 30, duration: 10, deps: ["T01", "T02"] } },
];

describe("Gantt", () => {
  it("draws one row per task with the % beside the id", () => {
    const { container } = render(<Gantt tasks={tasks} />);
    expect(container.querySelectorAll("[title]")).toHaveLength(3);
    expect(screen.getByText("T01").nextElementSibling?.textContent).toBe("100%");
    expect(screen.getByText("T02").nextElementSibling?.textContent).toBe("40%");
    expect(screen.getByTitle("T02 · 40%").style.left).toBe("37.5%");
  });

  it("draws one dashed path per dependency", () => {
    const { container } = render(<Gantt tasks={tasks} />);
    expect(container.querySelectorAll("svg path")).toHaveLength(3);
  });

  it("shows 'agora' only when now is given", () => {
    const { container, rerender } = render(<Gantt tasks={tasks} />);
    expect(container.querySelector("[data-now]")).toBeNull();
    rerender(<Gantt tasks={tasks} now={20} />);
    expect((container.querySelector("[data-now]") as HTMLElement).style.left).toBe("50%");
  });

  it("marks to-do bars as dashed and transparent", () => {
    render(<Gantt tasks={tasks} />);
    const bar = screen.getByTitle("T03 · 0%");
    expect(bar.dataset.status).toBe("todo");
    expect(bar.style.background).toBe("transparent");
  });
});
