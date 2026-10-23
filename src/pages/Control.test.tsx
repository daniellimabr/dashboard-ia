import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { sprintPct } from "../lib/progress";
import { formatTime } from "../lib/time";
import { renderAt } from "../test-utils";

/** Fakes clientHeight/offsetHeight per tag (jsdom has no layout); returns the restore function. */
function stubHeights(byTag: Record<string, number>) {
  const props = ["clientHeight", "offsetHeight"] as const;
  const saved = props.map((p) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, p));
  for (const p of props)
    Object.defineProperty(HTMLElement.prototype, p, {
      configurable: true,
      get(this: HTMLElement) {
        return byTag[this.tagName] ?? 0;
      },
    });
  return () =>
    props.forEach((p, i) => {
      const d = saved[i];
      if (d) Object.defineProperty(HTMLElement.prototype, p, d);
    });
}

const region = (name: string | RegExp) => within(screen.getByRole("region", { name }));
const s02 = data.sprints.find((x) => x.projectId === "dashboard-ia" && x.status === "active");
const pick = (name: RegExp) =>
  userEvent.click(
    within(screen.getByRole("navigation", { name: "Projetos" })).getByRole("button", { name }),
  );

describe("Control (Sala de controle)", () => {
  beforeEach(() => localStorage.clear()); // the menu remembers the picked project
  it("titles the page with the project and puts Agentes and Consumo before the tasks", () => {
    renderAt("/controle");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Dashboard IA › Sala de controle",
    );
    const tasks = screen.getByRole("region", { name: /Tarefas da sprint/ });
    for (const name of [/Agentes/, /Consumo/]) {
      const panel = screen.getByRole("region", { name });
      expect(panel.compareDocumentPosition(tasks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("task list: counter, times, waves, step labels, agent and progress value", () => {
    renderAt("/controle");
    const r = region(/Tarefas da sprint/);
    expect(r.getByText("1 / 7 concluídas")).toBeTruthy();
    for (const w of [1, 2, 3, 4]) expect(r.getByText(`Onda ${w}`)).toBeTruthy();
    const t01 = s02?.tasks[0];
    const row = (id: string) =>
      r.getAllByRole("row").find((x) => x.querySelector("b")?.textContent === id);
    expect(row("T01")?.textContent).toContain(formatTime(t01?.startedAt ?? ""));
    expect(row("T01")?.textContent).toContain(formatTime(t01?.endedAt ?? ""));
    expect(row("T03")?.textContent).toContain("40%");
  });

  it("gantt: legend with status, idle and the sprint's real waits, no example", () => {
    renderAt("/controle");
    const key = within(screen.getByRole("list", { name: "Legenda do plano" }));
    for (const k of ["Feita", "Rodando", "A fazer", "Ocioso", "Aguardando resposta"])
      expect(key.getByText(k)).toBeTruthy();
    expect(screen.queryByText(/exemplo/)).toBeNull();
    // T05 plan: start 70 of a 120 min plan window, 20 min long
    const t05 = screen
      .getAllByRole("tooltip")
      .find((t) => t.textContent?.startsWith("T05"))?.parentElement;
    expect(t05?.style.left).toMatch(/^58\.33/);
    expect(t05?.style.width).toMatch(/^16\.66/);
  });

  it("andamento: reply and limit waits summed from sprint.waits", () => {
    renderAt("/controle");
    const r = region(/Andamento/);
    expect(r.getByText("Ocioso")).toBeTruthy();
    const dd = (dt: string) => r.getByText(dt).nextElementSibling?.textContent;
    expect(dd("Aguardando você")).toBe("8 min");
    expect(dd("Aguardando limite")).toBe("15 min");
    expect(r.queryByText("Fim")).toBeNull();
  });

  it("andamento: no waits = sem dado", () => {
    renderAt("/controle", {
      ...data,
      sprints: data.sprints.map((x) => (x.id === s02?.id ? { ...x, waits: undefined } : x)),
    });
    const r = region(/Andamento/);
    expect(r.getByText("Aguardando limite").nextElementSibling?.textContent).toBe("sem dado");
  });

  it("agents: shows as many as fit the card; chevron only when some are left out", async () => {
    // jsdom has no layout: list 100px tall, rows 40px → 2 fit (cleaned up below)
    const restore = stubHeights({ UL: 100, LI: 40 });
    try {
      renderAt("/controle");
      await pick(/Main Harness/);
      const r = region(/Agentes/);
      expect(r.getByText("0/5 ativos")).toBeTruthy();
      expect(r.getAllByRole("group").length).toBe(2);
      expect(r.getAllByRole("group")[0]?.textContent).toContain("aguardando teste");
      await userEvent.click(r.getByRole("button", { name: "Mostrar todos os agentes" }));
      expect(r.getAllByRole("group").length).toBe(5);
      expect(r.getByText(/1,35/).textContent).toMatch(/tokens/);
      await userEvent.click(r.getByRole("button", { name: "Mostrar menos" }));
      expect(r.getAllByRole("group").length).toBe(2);
      expect(screen.getAllByRole("region", { name: /Andamento/ })[0]?.textContent).toContain("Fim");
    } finally {
      restore();
    }
  });

  it("agents: no chevron when all fit", async () => {
    renderAt("/controle"); // no layout = no limit
    await pick(/Main Harness/);
    const r = region(/Agentes/);
    expect(r.getAllByRole("group").length).toBe(5);
    expect(r.queryByRole("button", { name: /Mostrar/ })).toBeNull();
  });

  it("shows the sprint picked by ?p=&s=, else the project's main sprint", () => {
    renderAt("/controle?p=dashboard-ia&s=S01");
    expect(screen.getByText(/^S01 · Draft do front do painel/)).toBeTruthy();
    const s01 = data.sprints.find((x) => x.projectId === "dashboard-ia" && x.id === "S01");
    const n = s01?.tasks.length ?? 0;
    expect(region(/Tarefas da sprint/).getByText(`${n} / ${n} concluídas`)).toBeTruthy();
  });

  it("andamento: the bar is the sprint progress, with its value; run over plan as a number", () => {
    renderAt("/controle");
    const r = region(/Andamento/);
    const bar = r.getByRole("meter", { name: "Progresso da sprint" });
    expect(bar.getAttribute("aria-valuenow")).toBe(String(sprintPct(s02?.tasks ?? [])));
    expect(bar.textContent).toBe(`${sprintPct(s02?.tasks ?? [])}%`);
    expect(r.getByText("Corrido/previsto").nextElementSibling?.textContent).toMatch(/^\d+%$/);
  });

  it("limits: %, ticking countdown and reset time for 5 h and weekly; 100% stands out", () => {
    renderAt("/controle", {
      ...data,
      limits: { ...data.limits, h5: { ...data.limits.h5, pct: 100 } },
    });
    const r = region("Limites de uso");
    const h5 = r.getByText("Limite 5 h").closest("div");
    expect(h5?.textContent).toMatch(/100%.*renova em 01:(39|40).*às \d\d:\d\d/);
    expect(h5?.getAttribute("data-tone")).toBe("bad");
    const week = r.getByText("Semanal").closest("div");
    expect(week?.textContent).toMatch(/41%.*renova em 3D-18:(09|10)/);
    expect(week?.getAttribute("data-tone")).toBeNull();
  });

  it("limits: no reset time = sem dado", () => {
    renderAt("/controle", {
      ...data,
      limits: { ...data.limits, week: { pct: 41 } },
    });
    expect(region("Limites de uso").getByText("Semanal").closest("div")?.textContent).toContain(
      "sem dado",
    );
  });

  it("agents: missing cost reads sem dado", () => {
    renderAt("/controle", {
      ...data,
      chats: data.chats.map((c) => ({
        ...c,
        agents: c.agents.map((a) => ({ ...a, usd: undefined, tokens: undefined })),
      })),
    });
    const r = region(/Agentes/);
    expect(r.getAllByText(/custo sem dado · tokens sem dado/).length).toBeGreaterThan(0);
    expect(r.getAllByText("trabalhando").length).toBeGreaterThan(0);
  });

  it("consumo: axis title and tooltip with spend and tokens", () => {
    renderAt("/controle");
    const r = region(/Consumo/);
    expect(r.getByText(/Gasto por dia/)).toBeTruthy();
    expect(r.getAllByRole("tooltip").some((t) => /US\$.*tokens/.test(t.textContent ?? ""))).toBe(
      true,
    );
  });
});
