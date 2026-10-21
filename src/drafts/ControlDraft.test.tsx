import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { renderAt } from "../test-utils";
import { DraftRoutes } from "./routes";

const col = (name: string) =>
  within(screen.getByRole("heading", { name, level: 2 }).closest("section") as HTMLElement);

describe("ControlDraft", () => {
  it("shows the recent sprints as tabs; a tab switches Horários and Itens to that sprint", async () => {
    renderAt("/rascunho/controle", data, DraftRoutes);
    col("Dashboard IA").getByText(/^Em execução desde/);
    col("Main Harness").getByText(/^Aguardando revisão de Daniel desde/);
    col("Finanças Casa").getByText(/^Ocioso desde/);

    let c = col("Dashboard IA");
    expect(c.getAllByRole("tab").map((t) => t.textContent)).toEqual(["S02", "S01"]);
    c.getByText(/^S02 · Layout/);
    await userEvent.click(c.getByRole("tab", { name: "S01" }));
    c = col("Dashboard IA"); // the column remounts per sprint
    expect(c.getByRole("tab", { name: "S01" }).getAttribute("aria-selected")).toBe("true");
    c.getByText("Concluída");
    c.getByText(/^S01 · Draft/);
    c.getByText("Horários");
  });

  it("variant B labels each tab with its state", async () => {
    renderAt("/rascunho/controle", data, DraftRoutes);
    await userEvent.click(screen.getByRole("button", { name: "Variante B" }));
    const c = col("Dashboard IA");
    c.getByRole("tab", { name: /^S01 ?· concluída/ });
    c.getByRole("tab", { name: /^S02 ?· em curso/ });
  });
});
