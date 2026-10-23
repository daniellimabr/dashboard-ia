import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { data } from "../data/mock";
import type { Task } from "../data/types";
import { DataProvider } from "../lib/useData";
import { Gantt, idleGaps, Meter, TaskTable, taskEnd } from "./ui";

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

  it("Gantt legend: one short line, detail in the title, pauses only when present", () => {
    const { rerender } = render(
      <Gantt tasks={tasks} start={new Date(T0).toISOString()} now={T0 + 18 * MIN} />,
    );
    const items = () => [
      ...screen.getByRole("list", { name: "Legenda do plano" }).querySelectorAll("li"),
    ];
    const seen = (li: Element) => (li.querySelector("[aria-hidden]") ?? li).textContent ?? "";
    expect(items().map(seen)).toEqual(["Feita", "Rodando", "Reprovada", "A fazer", "%", "Agora"]);
    expect(items().every((li) => li.getAttribute("title"))).toBe(true);
    expect(items()[4]?.getAttribute("title")).toMatch(/mais perto de 100%/);
    rerender(
      <Gantt
        tasks={tasks}
        start={new Date(T0).toISOString()}
        now={T0 + 18 * MIN}
        waits={[{ kind: "limit", start: T0 + 11 * MIN, end: T0 + 13 * MIN }]}
      />,
    );
    expect(items().map(seen)).toContain("Limite");
    expect(items().every((li) => seen(li).length <= 9)).toBe(true);
  });

  it("taskEnd: real end when finished, start + plan when started, sprint plan otherwise", () => {
    const start = new Date(T0).toISOString();
    expect(taskEnd(tasks[0] as Task, start)).toEqual({ ms: T0 + 10 * MIN, real: true });
    expect(taskEnd(tasks[1] as Task, start)).toEqual({ ms: T0 + 25 * MIN, real: false });
    const todo: Task = {
      id: "T03",
      title: "c",
      done: false,
      plan: { start: 20, duration: 30, deps: [] },
    };
    expect(taskEnd(todo, start)).toEqual({ ms: T0 + 50 * MIN, real: false });
    expect(taskEnd(todo)).toBeUndefined();
  });

  describe("TaskTable", () => {
    afterEach(() => vi.useRealTimers());
    const table = (list: Task[]) =>
      render(
        <DataProvider initial={{ ...data, chats: [] }}>
          <TaskTable tasks={list} start={new Date(T0).toISOString()} />
        </DataProvider>,
      );

    it("groups tasks under a header per wave", () => {
      table([
        { ...(tasks[0] as Task), wave: 1 },
        { ...(tasks[1] as Task), wave: 2 },
      ]);
      const groups = screen.getAllByRole("rowgroup").filter((g) => g.dataset.wave);
      expect(groups.map((g) => g.querySelector("th")?.textContent)).toEqual([
        expect.stringContaining("Onda 1"),
        expect.stringContaining("Onda 2"),
      ]);
      expect(groups[1]?.textContent).toContain("T02");
      expect(screen.getByRole("columnheader", { name: "Fim previsto" })).toBeTruthy();
    });

    it("duration bar: elapsed over planned minutes, alert above plan", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(T0 + 27 * MIN); // T02: 12 of 10 planned
      table(tasks);
      const bar = (id: string) => screen.getByRole("meter", { name: `Duração de ${id}` });
      expect(bar("T01").getAttribute("aria-valuetext")).toBe("10/10 min");
      expect(bar("T01").querySelector("i")?.dataset.tone).toBe("ok");
      expect(bar("T02").getAttribute("aria-valuetext")).toBe("12/10 min");
      expect(bar("T02").querySelector("i")?.dataset.tone).toBe("warn");
    });

    it("duration bar inside the plan keeps the task tone", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(T0 + 20 * MIN); // T02: 5 of 10
      table(tasks);
      const t02 = screen.getByRole("meter", { name: "Duração de T02" });
      expect(t02.getAttribute("aria-valuetext")).toBe("5/10 min");
      expect(t02.querySelector("i")?.dataset.tone).toBe("run");
    });
  });
});
