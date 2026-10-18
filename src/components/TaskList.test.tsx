import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskList } from "./TaskList";

describe("TaskList", () => {
  it("shows done checkbox, times and durations, live for running tasks", () => {
    render(
      <TaskList
        now={Date.parse("2026-10-16T20:30:00Z")}
        tasks={[
          {
            id: "T01",
            title: "Base",
            done: true,
            startedAt: "2026-10-16T19:00:00Z",
            endedAt: "2026-10-16T20:05:00Z",
          },
          { id: "T02", title: "Tela", done: false, startedAt: "2026-10-16T20:00:00Z" },
          { id: "T03", title: "Depois", done: false },
        ]}
      />,
    );
    const boxes = screen.getAllByRole<HTMLInputElement>("checkbox");
    expect(boxes.map((b) => b.checked)).toEqual([true, false, false]);
    screen.getByText("16:00");
    screen.getByText("1 h 05 min");
    screen.getByText("30 min");
    screen.getByText("em andamento");
  });
});
