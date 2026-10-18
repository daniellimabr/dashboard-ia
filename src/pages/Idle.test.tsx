import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderAt } from "../test-utils";

describe("Idle", () => {
  it("lists idle projects with last sprint, activity and weekly cost", () => {
    renderAt("/ociosos");
    screen.getByRole("heading", { level: 1, name: "Ociosos" });
    screen.getByText(/sem atividade há mais de 7 dias/);
    screen.getByRole("heading", { level: 2, name: "Bot Telegram" });
    screen.getByRole("heading", { level: 2, name: "Planilha Orçamento" });
    screen.getByText("S04 fechada · última atividade há 9 dias");
    screen.getByText("sem sprint · última atividade há 23 dias");
    expect(screen.getAllByText(/US\$\s0,00 na semana/)).toHaveLength(2);
  });

  it("promotes a project back to the active screens", async () => {
    const user = userEvent.setup();
    renderAt("/ociosos");
    const [first] = screen.getAllByRole("button", { name: "Trazer para ativos" });
    await user.click(first as HTMLElement);
    expect(screen.queryByRole("heading", { name: "Bot Telegram" })).toBeNull();
    screen.getByRole("link", { name: "Ociosos (1)" });
    await user.click(screen.getByRole("link", { name: "Bem-vindo de volta" }));
    screen.getByText("Bot Telegram");
  });
});
