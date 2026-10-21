import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import type { Sprint } from "../data/types";
import { renderAt } from "../test-utils";

const col = (name: string) =>
  within(screen.getByRole("heading", { name, level: 2 }).closest("section") as HTMLElement);

const accordions = (c: ReturnType<typeof col>) =>
  c.getAllByRole("button").filter((b) => b.hasAttribute("aria-expanded"));

async function openSprint(c: ReturnType<typeof col>) {
  const btn = accordions(c).find((b) => b.textContent?.startsWith("Itens da sprint"));
  btn?.focus();
  await userEvent.keyboard("{Enter}");
  return btn as HTMLElement;
}

describe("Control", () => {
  it("shows one column per active project with phase and alerts", () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    c.getByText("Execução");
    c.getByText("Reviewer reprovou T02");
    expect(screen.queryByRole("heading", { name: "Bot Telegram" })).toBeNull();
  });

  it("links the project name to its page", () => {
    renderAt("/controle");
    expect(
      col("Dashboard IA").getByRole("link", { name: "Dashboard IA" }).getAttribute("href"),
    ).toBe("/p/dashboard-ia");
  });

  it("links the sprint id to the project's sprint", () => {
    renderAt("/controle");
    expect(col("Dashboard IA").getByRole("link", { name: "S02" }).getAttribute("href")).toBe(
      "/p/dashboard-ia/sprints/S02",
    );
  });

  const state = (name: string) =>
    accordions(col(name)).map(
      (b) =>
        `${/^(Horários|Fora|Itens|Agentes|Consumo)/.exec(b.textContent ?? "")?.[0]}:${b.getAttribute("aria-expanded")}`,
    );

  it("orders the accordions and opens only where something is running", () => {
    renderAt("/controle");
    expect(state("Dashboard IA")).toEqual([
      "Horários:false",
      "Fora:false",
      "Itens:true",
      "Agentes:false",
      "Consumo:true",
    ]);
    expect(state("Main Harness")).toEqual([
      "Horários:false",
      "Fora:true",
      "Itens:false",
      "Agentes:false",
      "Consumo:true",
    ]);
    expect(state("Finanças Casa")).toEqual([
      "Horários:false",
      "Itens:false",
      "Agentes:false",
      "Consumo:true",
    ]);
  });

  it("shows the main info on closed accordions", () => {
    renderAt("/controle");
    const [hours, , , agents, money] = accordions(col("Dashboard IA"));
    expect(hours?.textContent).toMatch(/\d+\/7 feitas/);
    expect(agents?.textContent).toMatch(/\d+ rodando · contexto máx\. \d+%/);
    expect(money?.textContent).toMatch(/US\$.* hoje · \d+% do limite 5 h/);
    const fc = accordions(col("Finanças Casa"));
    expect(fc[2]?.textContent).toContain("nenhum rodando");
  });

  it("puts the gantt and the elapsed bar inside Horários", async () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    expect(c.queryByTestId("gantt")).toBeNull();
    const btn = accordions(c)[0] as HTMLElement;
    btn.focus();
    await userEvent.keyboard("{Enter}");
    const box = within(btn.parentElement as HTMLElement);
    box.getByText("Corrido");
    box.getByTestId("gantt");
    box.getByText("Duração corrida");
  });

  it("shows tasks outside the sprint without %, and hides the block when there are none", async () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    const btn = accordions(c)[1] as HTMLElement;
    expect(btn.textContent).toContain("1 tarefa");
    btn.focus();
    await userEvent.keyboard("{Enter}");
    const row = c
      .getByText("Ajustar hook post-edit (lento no Windows)")
      .closest("div") as HTMLElement;
    expect(row.parentElement?.textContent).not.toMatch(/%/);
    c.getByText("hook lento");
    within(row.parentElement as HTMLElement).getByText("feita");
    const fc = col("Finanças Casa");
    expect(accordions(fc).some((b) => b.textContent?.startsWith("Fora da sprint"))).toBe(false);
  });

  it("opens and closes the sprint items by keyboard, with % and steps", async () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    const btn = accordions(c).find((b) =>
      b.textContent?.startsWith("Itens da sprint"),
    ) as HTMLElement;
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.textContent).toContain("31%");
    c.getByText("1 reprov.");
    c.getByText("onda 2 de 4");
    c.getByText("Revisão ✕");
    const items = within(btn.parentElement as HTMLElement);
    expect(items.queryByText("Duração corrida")).toBeNull();
    expect(items.queryByText("Gasto da sprint")).toBeNull();
    btn.focus();
    const on = c.getByTitle("Clone 1 executando agora"); // getBy: exactly one lit icon
    expect(on.textContent).toBe("C1");
    expect(on.className).toContain("on");
    expect(on.closest("button, div")?.textContent).toContain("T03");
    await userEvent.keyboard("{Enter}");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(c.queryByText("Revisão ✕")).toBeNull();
  });

  it("uses the planned sprint when none is active", async () => {
    renderAt("/controle");
    const c = col("Finanças Casa");
    c.getByText(/não começou/);
    await openSprint(c);
    c.getByText(/^S03 · .+ — /);
  });

  it("shows the latest closed sprint as Concluída when none is active or planned", () => {
    const closed = (id: string, closedAt: string) => ({
      ...(data.sprints[0] as Sprint),
      id,
      status: "closed" as const,
      closedAt,
    });
    renderAt("/controle", {
      ...data,
      sprints: [
        closed("S01", "2026-10-01T10:00:00Z"),
        closed("S02", "2026-10-03T10:00:00Z"),
        ...data.sprints.filter((s) => s.projectId !== "dashboard-ia"),
      ],
    });
    const c = col("Dashboard IA");
    c.getByRole("link", { name: "S02" });
    c.getByText("Concluída");
    expect(col("Main Harness").queryByText("Concluída")).toBeNull();
  });

  it("lists running agents with context, and the spend inside Consumo", async () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    const [, , , agents, money] = accordions(c) as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    agents.focus();
    await userEvent.keyboard("{Enter}");
    c.getByText("Clone 1");
    c.getByTitle("contexto 21%");
    const m = within(money.parentElement as HTMLElement);
    m.getByText(/tokens hoje/);
    m.getByRole("img", { name: /gasto/i });
    m.getByText("Gasto da sprint");
    const fc = col("Finanças Casa");
    (accordions(fc)[2] as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    fc.getByText("nenhum agente rodando");
  });
});
