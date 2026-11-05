import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { formatTokens, formatUsd } from "../lib/format";
import { formatPct } from "../lib/pct";
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
        // an expanded list loses its CSS height cap, so it grows to fit every row
        if (this.hasAttribute("data-all")) return 1000;
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
    // T05 is still to do: dashed bar, never before its plan slot (start 70 of 120 min);
    // it is pushed past "now" when the plan slot already passed, so left depends on the clock
    const t05 = screen
      .getAllByRole("tooltip")
      .find((t) => t.textContent?.startsWith("T05"))?.parentElement;
    expect(parseFloat(t05?.style.left ?? "")).toBeGreaterThanOrEqual(58.33);
    expect(parseFloat(t05?.style.width ?? "")).toBeGreaterThan(0);
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

  describe("clone without a task in the event", () => {
    const withAgents = (keep: string[]) => ({
      ...data,
      chats: data.chats.map((c) =>
        c.id === "c-dash-2"
          ? {
              ...c,
              agents: [
                ...c.agents.filter((a) => keep.includes(a.id)),
                { id: "x", kind: "clone" as const, name: "Clone 3", startedAt: c.startedAt },
              ],
            }
          : c,
      ),
    });
    const row = () => screen.getByText("Clone 3").closest("li");

    it("shows the running task planned for clones that no other agent took", () => {
      renderAt("/controle", withAgents(["a3"])); // T03 is a3's; T04 is free
      expect(row()?.textContent).toContain("T04");
      expect(row()?.textContent).not.toContain("T03");
    });

    it("says the harness did not inform the task when there is no candidate", () => {
      renderAt("/controle", withAgents(["a3", "a4"]));
      expect(row()?.textContent).toContain("Tarefa não informada pelo harness");
      expect(screen.queryByText("Sem tarefa nesta sprint.")).toBeNull();
    });
  });

  it("agents: no context bar or ctx text", () => {
    renderAt("/controle");
    const r = region(/Agentes/);
    expect(r.queryByText(/ctx/)).toBeNull();
    expect(r.queryByText("Contexto usado pelo agente")).toBeNull();
    expect(r.queryAllByRole("meter")).toHaveLength(0);
  });

  it("consumo: sprint US$, % of 5 h and week, and tokens by kind", () => {
    renderAt("/controle");
    const r = region(/Consumo/);
    const c = s02?.consumption;
    expect(c).toBeTruthy();
    const line = r.getByText(/Sprint/).textContent ?? "";
    expect(line).toContain(formatUsd(c?.usd ?? 0));
    expect(line).toContain(`${formatPct(c?.pct5h ?? 0)} das 5 h`);
    expect(line).toContain(`${formatPct(c?.pctWeek ?? 0)} da semana`);
    const dd = (dt: string) => r.getByText(dt).nextElementSibling?.textContent;
    expect(dd("Entrada")).toBe(formatTokens(c?.input ?? 0));
    expect(dd("Saída")).toBe(formatTokens(c?.output ?? 0));
    expect(dd("Cache lido")).toBe(formatTokens(c?.cacheRead ?? 0));
    expect(dd("Cache escrito")).toBe(formatTokens(c?.cacheWrite ?? 0));
  });

  it("consumo: sprint without consumption reads — and not zero", () => {
    renderAt("/controle", {
      ...data,
      sprints: data.sprints.map((x) => (x.id === s02?.id ? { ...x, consumption: undefined } : x)),
    });
    const r = region(/Consumo/);
    expect(r.getByText("Entrada").nextElementSibling?.textContent).toBe("—");
    expect(r.getByText(/Sprint/).textContent).toContain("—");
  });

  it("agents: US$, % and tokens by kind per agent; none = —", () => {
    renderAt("/controle");
    const a3 = data.chats.flatMap((c) => c.agents).find((a) => a.id === "a3")?.consumption;
    const li = region(/Agentes/)
      .getByText("Clone 1")
      .closest("li");
    expect(li?.textContent).toContain(formatPct(a3?.pct5h ?? 0));
    expect(li?.textContent).toContain(formatPct(a3?.pctWeek ?? 0));
    expect(within(li as HTMLElement).getByText("Cache lido").nextElementSibling?.textContent).toBe(
      formatTokens(a3?.cacheRead ?? 0),
    );
    cleanup();
    renderAt("/controle", {
      ...data,
      chats: data.chats.map((c) => ({
        ...c,
        agents: c.agents.map((a) => ({ ...a, consumption: undefined })),
      })),
    });
    const none = region(/Agentes/).getAllByText("Entrada")[0];
    expect(none?.nextElementSibling?.textContent).toBe("—");
  });

  it("task list: Consumo column with US$, % and kinds; none = —", () => {
    const c = {
      input: 1_000,
      output: 2_000,
      cacheRead: 3_000,
      cacheWrite: 4_000,
      usd: 1.5,
      pct5h: 5,
      pctWeek: 0.7,
    };
    renderAt("/controle", {
      ...data,
      sprints: data.sprints.map((x) =>
        x.id === s02?.id
          ? {
              ...x,
              tasks: x.tasks.map((t) => ({ ...t, consumption: t.id === "T01" ? c : undefined })),
            }
          : x,
      ),
    });
    const r = region(/Tarefas da sprint/);
    expect(r.getByRole("columnheader", { name: "Consumo" })).toBeTruthy();
    const row = (id: string) =>
      r.getAllByRole("row").find((x) => x.querySelector("b")?.textContent === id);
    expect(row("T01")?.textContent).toContain(`${formatUsd(1.5)} · 5% das 5 h · 0,7% da semana`);
    const cell = (id: string) => within(row(id) as HTMLElement);
    expect(cell("T01").getByText("Cache escrito").nextElementSibling?.textContent).toBe(
      formatTokens(4_000),
    );
    expect(cell("T02").getByText("Entrada").nextElementSibling?.textContent).toBe("—");
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
