import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../../data/mock";
import { DataProvider } from "../../lib/useData";
import { formatTime } from "../../lib/time";
import { ControlRoom } from "./screens";
import { idleGaps, Meter } from "./ui";

const project = (id: string) => {
  const p = data.projects.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
};
const show = (id = "dashboard-ia") =>
  render(
    <DataProvider initial={data}>
      <ControlRoom project={project(id)} />
    </DataProvider>,
  );
const region = (name: string | RegExp) => within(screen.getByRole("region", { name }));
const s02 = data.sprints.find((x) => x.projectId === "dashboard-ia" && x.status === "active");

describe("ControlRoom (direction C)", () => {
  it("puts Agentes and Consumo before the task list", () => {
    show();
    const tasks = screen.getByRole("region", { name: /Tarefas da sprint/ });
    for (const name of [/Agentes/, /Consumo/]) {
      const panel = screen.getByRole("region", { name });
      expect(panel.compareDocumentPosition(tasks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("task list: counter, times, waves, step labels, agent and progress value", () => {
    show();
    const r = region(/Tarefas da sprint/);
    expect(r.getByText("1 / 7 concluídas")).toBeTruthy();
    for (const w of [1, 2, 3, 4]) expect(r.getByText(`Onda ${w}`)).toBeTruthy();
    expect(r.getAllByText("Revisão").length).toBeGreaterThanOrEqual(7);
    const t01 = s02?.tasks[0];
    const row = (id: string) =>
      r.getAllByRole("row").find((x) => x.querySelector("b")?.textContent === id);
    expect(row("T01")?.textContent).toContain(formatTime(t01?.startedAt ?? ""));
    expect(row("T01")?.textContent).toContain(formatTime(t01?.endedAt ?? ""));
    expect(row("T01")?.textContent).toContain("18 min");
    expect(row("T03")?.textContent).toContain("C1");
    expect(row("T01")?.textContent).toContain("TL");
    expect(row("T03")?.textContent).toContain("40%");
  });

  it("gantt legend names executed, planned, idle and the example waits", () => {
    show();
    const key = within(screen.getByRole("list", { name: "Legenda do plano" }));
    for (const k of ["Executado", "Previsto", "Ocioso", "Aguardando resposta", "Aguardando limite"])
      expect(key.getByText(k)).toBeTruthy();
    expect(key.getAllByText("exemplo").length).toBe(2);
  });

  it("agents: every agent, status label, cost and task dropdown", () => {
    show();
    const r = region(/Agentes/);
    expect(r.getByText("Reviewer")).toBeTruthy();
    expect(r.getByText("desativado")).toBeTruthy();
    expect(r.getAllByText("trabalhando").length).toBeGreaterThan(0);
    expect(r.getAllByText(/US\$/).length).toBeGreaterThan(0);
    expect(r.getAllByRole("group").length).toBe(4); // <details> per agent
  });

  it("consumo: axis title and tooltip with spend and tokens", () => {
    show();
    const r = region(/Consumo/);
    expect(r.getByText(/Gasto por dia/)).toBeTruthy();
    expect(r.getAllByRole("tooltip").some((t) => /US\$.*tokens/.test(t.textContent ?? ""))).toBe(
      true,
    );
  });

  it("andamento: idle time, limit wait (example) and end of a finished sprint", () => {
    show();
    const r = region(/Andamento/);
    expect(r.getByText("Ocioso")).toBeTruthy();
    expect(r.getByText(/Aguardando limite/)).toBeTruthy();
    expect(r.queryByText("Fim")).toBeNull();
    show("main-harness");
    const mh = within(screen.getAllByRole("region", { name: /Andamento/ })[1] as HTMLElement);
    expect(mh.getByText("Fim")).toBeTruthy();
  });
});

describe("ui helpers", () => {
  it("Meter shows the value inside the bar only when asked", () => {
    const { rerender } = render(<Meter label="m" pct={40} showValue />);
    expect(screen.getByText("40%")).toBeTruthy();
    rerender(<Meter label="m" pct={40} />);
    expect(screen.queryByText("40%")).toBeNull();
  });

  it("idleGaps returns stretches with no task running", () => {
    const iso = (m: number) => new Date(m * 60_000).toISOString();
    const t = (id: string, a: number, b?: number) => ({
      id,
      title: id,
      done: false,
      startedAt: iso(a),
      endedAt: b === undefined ? undefined : iso(b),
    });
    const gaps = idleGaps([t("A", 0, 10), t("B", 5, 20), t("C", 30)], 0, 40 * 60_000);
    expect(gaps.map((g) => [g.start / 60_000, g.end / 60_000])).toEqual([[20, 30]]);
  });
});
