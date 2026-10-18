import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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

  it("orders the four accordions and opens the first two", () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    const titles = accordions(c).map((b) => b.textContent ?? "");
    expect(titles[0]).toMatch(/^Timeline/);
    expect(titles[1]).toMatch(/^Horários/);
    expect(titles[2]).toMatch(/^Fora da sprint/);
    expect(titles[3]).toMatch(/^Itens da sprint/);
    expect(accordions(c).map((b) => b.getAttribute("aria-expanded"))).toEqual([
      "true",
      "true",
      "false",
      "false",
    ]);
    c.getByTestId("gantt");
    c.getByText("Corrido");
  });

  it("shows tasks outside the sprint without %, and hides the block when there are none", async () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    const btn = accordions(c)[2] as HTMLElement;
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
    const btn = await openSprint(c);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.textContent).toContain("31%");
    c.getByText("1 reprov.");
    c.getByText("onda 2 de 4");
    c.getByText("Revisão ✕");
    c.getByText("Duração corrida");
    c.getByText("Gasto da sprint");
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
    c.getByText("não começou");
    await openSprint(c);
    c.getByText(/^S03 · .+ — /);
  });

  it("lists running agents with context and the day's spend", () => {
    renderAt("/controle");
    const c = col("Dashboard IA");
    c.getByText("Clone 1");
    c.getByTitle("contexto 21%");
    c.getByText(/tokens hoje/);
    c.getByText(/% do limite 5 h/);
    c.getByRole("img", { name: /gasto/i });
    col("Finanças Casa").getByText("nenhum agente rodando");
  });
});
