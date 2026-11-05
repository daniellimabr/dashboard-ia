import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { renderAt } from "../test-utils";

const side = () => within(screen.getByRole("navigation", { name: "Projetos" }));
const telas = () => within(screen.getByRole("navigation", { name: "Telas" }));
const itens = () => within(screen.getByRole("navigation", { name: "Itens do projeto" }));

afterEach(() => localStorage.clear());

describe("Layout (direction C frame)", () => {
  it("lists the screens, the picked project's items, the projects and both limits", () => {
    renderAt("/");
    for (const name of ["Início", "Sala de controle", "Linha do tempo"])
      telas().getByRole("link", { name });
    expect(telas().queryByRole("link", { name: "Componentes" })).toBeNull();
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

  it("has no theme switch: the dashboard is dark only", () => {
    renderAt("/");
    expect(screen.queryByRole("button", { name: /Tema/ })).toBeNull();
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

  it("in the control room a sprint opens the room for that sprint, and is highlighted", async () => {
    renderAt("/controle?p=main-harness&s=S04");
    await userEvent.click(side().getByRole("button", { name: /Main Harness/ }));
    const links = within(
      side().getByRole("list", { name: "Sprints de Main Harness" }),
    ).getAllByRole("link");
    expect(links[0]?.getAttribute("href")).toBe("/controle?p=main-harness&s=S05");
    const s04 = links.find((a) => a.textContent?.includes("S04"));
    expect(s04?.getAttribute("aria-current")).toBe("true");
    expect(links[0]?.getAttribute("aria-current")).toBeNull();
  });

  it("outside the control room a sprint opens its page, highlighted there", () => {
    renderAt("/p/main-harness/sprints/S05");
    const links = within(
      side().getByRole("list", { name: "Sprints de Main Harness" }),
    ).getAllByRole("link");
    expect(links[0]?.getAttribute("href")).toBe("/p/main-harness/sprints/S05");
    expect(links[0]?.getAttribute("aria-current")).toBe("true");
  });

  it("both limits show the countdown and the reset time", () => {
    renderAt("/");
    const limit = (name: string) =>
      screen.getByRole("meter", { name }).parentElement?.textContent ?? "";
    expect(limit("Limite 5 h")).toMatch(/renova em 01:(39|40)\s*às \d\d:\d\d/);
    expect(limit("Semanal")).toMatch(/renova em 3D-18:(09|10)\s*\S+ \d\d:\d\d/);
  });

  it("a limit without reset time says 'sem dado'", () => {
    renderAt("/", { ...data, limits: { ...data.limits, week: { pct: 10 } } });
    expect(screen.getByRole("meter", { name: "Semanal" }).parentElement?.textContent).toMatch(
      /sem dado/,
    );
  });

  it("an estimated limit says 'estimado' instead of the countdown", () => {
    renderAt("/", { ...data, limits: { ...data.limits, week: { pct: 10, estimated: true } } });
    expect(screen.getByRole("meter", { name: "Semanal" }).parentElement?.textContent).toMatch(
      /estimado/,
    );
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
