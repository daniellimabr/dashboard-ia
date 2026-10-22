import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { renderAt } from "../test-utils";

const side = () => within(screen.getByRole("navigation", { name: "Projetos" }));
const telas = () => within(screen.getByRole("navigation", { name: "Telas" }));
const itens = () => within(screen.getByRole("navigation", { name: "Itens do projeto" }));

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("Layout (direction C frame)", () => {
  it("lists the screens, the picked project's items, the projects and both limits", () => {
    renderAt("/");
    for (const name of ["Início", "Sala de controle", "Linha do tempo", "Componentes"])
      telas().getByRole("link", { name });
    telas().getByRole("link", { name: "Ociosos (2)" });
    for (const [path, name] of [
      ["chats", "Chats"],
      ["sprints", "Sprints"],
      ["backlog", "Backlog"],
      ["roadmap", "Roadmap"],
      ["docs", "Documentos"],
      ["usage", "Consumo"],
    ])
      expect(itens().getByRole("link", { name }).getAttribute("href")).toBe(
        `/p/dashboard-ia/${path}`,
      );
    side().getByText("Main Harness");
    screen.getByRole("meter", { name: "Limite 5 h" });
    screen.getByRole("meter", { name: "Semanal" });
  });

  it("is dark by default; the theme button switches to light and remembers it", async () => {
    const view = renderAt("/");
    expect(document.documentElement.dataset.theme).toBe("dark");
    await userEvent.click(screen.getByRole("button", { name: "Tema claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("dash.theme")).toBe("light");
    view.unmount();
    renderAt("/");
    expect(document.documentElement.dataset.theme).toBe("light");
    screen.getByRole("button", { name: "Tema escuro" });
  });

  it("titles the browser tab after the screen or project item", async () => {
    renderAt("/");
    expect(document.title).toBe("Dashboard IA: Início");
    await userEvent.click(telas().getByRole("link", { name: "Sala de controle" }));
    expect(document.title).toBe("Dashboard IA: Sala de controle");
    await userEvent.click(itens().getByRole("link", { name: "Consumo" }));
    expect(document.title).toBe("Dashboard IA: Dashboard IA › Consumo");
    screen.getByRole("heading", { level: 1, name: "Dashboard IA › Consumo" });
  });

  it("picking a project selects it, opens its accordion and keeps the open item", async () => {
    renderAt("/p/dashboard-ia/sprints");
    const btn = side().getByRole("button", { name: /Main Harness/ });
    await userEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.getAttribute("aria-current")).toBe("true");
    screen.getByRole("heading", { level: 1, name: "Main Harness › Sprints" });
    itens().getByText("Itens de Main Harness");
    const sprints = within(side().getByRole("list", { name: "Sprints de Main Harness" }));
    const items = sprints.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toMatch(/S05.*Entregue/);
    expect(items[1]).toMatch(/S04.*Fechada/);
    expect(sprints.getAllByRole("link")[0]?.getAttribute("href")).toBe(
      "/p/main-harness/sprints/S05",
    );
    const loose = within(side().getByRole("list", { name: "Chats sem sprint de Main Harness" }));
    loose.getByText("dúvida handoff");
    expect(loose.queryByText("Executar sprint S05")).toBeNull();
    await userEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("the accordion shows at most the 5 latest sprints", async () => {
    const extra = ["S03", "S04", "S05", "S06", "S07"].map((id) => ({
      id,
      projectId: "dashboard-ia",
      title: `Sprint ${id}`,
      status: "planned" as const,
      tasks: [],
    }));
    renderAt("/", { ...data, sprints: [...data.sprints, ...extra] });
    const btn = side().getByRole("button", { name: /Dashboard IA/ });
    if (btn.getAttribute("aria-expanded") !== "true") await userEvent.click(btn);
    const items = within(side().getByRole("list", { name: "Sprints de Dashboard IA" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(items).toHaveLength(5);
    expect(items[0]).toMatch(/S07.*Planejada/);
    expect(items.join()).not.toMatch(/S01|S02/);
  });
});
