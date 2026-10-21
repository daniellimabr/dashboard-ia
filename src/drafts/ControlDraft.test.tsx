import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

const col = (name: string) =>
  within(screen.getByRole("heading", { name, level: 2 }).closest("section") as HTMLElement);

describe("ControlDraft", () => {
  it("variant A shows state badges with 'desde' and a sprint picker", async () => {
    renderAt("/rascunho/controle");
    col("Dashboard IA").getByText(/^Em execução desde/);
    col("Main Harness").getByText(/^Aguardando revisão de Daniel desde/);
    col("Finanças Casa").getByText(/^Ocioso desde/);
    col("Main Harness").getByText("limite assinatura");

    const pick = col("Dashboard IA").getByRole("combobox", { name: "Sprint" });
    expect([...pick.querySelectorAll("option")].map((o) => o.value)).toEqual(["S02", "S01"]);
    await userEvent.selectOptions(pick, "S01");
    col("Dashboard IA").getByText("Concluída");
  });

  it("variant B swaps the picker for a sprint list", async () => {
    renderAt("/rascunho/controle");
    await userEvent.click(screen.getByRole("button", { name: "Variante B" }));
    expect(screen.queryByRole("combobox")).toBeNull();
    const c = col("Dashboard IA");
    await userEvent.click(c.getByRole("button", { name: "S01" }));
    c.getByText("Concluída");
  });
});
