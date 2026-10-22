import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { data } from "../../data/mock";
import type { Data } from "../../data/types";
import { DataProvider } from "../../lib/useData";
import { Draft, type Screen } from "./index";

const show = (screen: Screen, onScreen = vi.fn(), initial: Data = data) =>
  render(
    <MemoryRouter>
      <DataProvider initial={initial}>
        <Draft screen={screen} onScreen={onScreen} />
      </DataProvider>
    </MemoryRouter>,
  );

const side = () => within(screen.getByRole("navigation", { name: "Projetos" }));
const nav = (name: RegExp | string) =>
  userEvent.click(
    within(screen.getByRole("navigation", { name: "Telas" })).getByRole("button", { name }),
  );

describe("Draft C", () => {
  it("home shows, per project, sprint, task, phase, %, spend, open chats, alerts and idle", () => {
    show("home");
    const panel = screen.getByRole("region", { name: "Dashboard IA" });
    const p = within(panel);
    expect(p.getByTestId("sprint").textContent).toContain("S02");
    expect(p.getByText("Execução")).toBeTruthy();
    expect(p.getAllByText(/\d+%/).length).toBeGreaterThan(0);
    expect(p.getAllByText(/US\$/).length).toBeGreaterThan(0);
    expect(p.getByText("Executar sprint S02")).toBeTruthy();
    expect(p.getByText("Reviewer reprovou T02")).toBeTruthy();
    expect(p.getByTestId("current-task").textContent).toMatch(/T\d\d/);
    const idle = screen.getByRole("region", { name: /Ociosos/ });
    expect(within(idle).getByText("Bot Telegram")).toBeTruthy();
  });

  it("frame has limits, project list and calls onScreen", async () => {
    const onScreen = vi.fn();
    show("home", onScreen);
    expect(screen.getByRole("meter", { name: "Limite 5 h" })).toBeTruthy();
    expect(screen.getByRole("meter", { name: "Semanal" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Projetos" });
    expect(within(nav).getByText("Main Harness")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Sala de controle" }));
    expect(onScreen).toHaveBeenCalledWith("control");
  });

  it.each(["components", "control", "sprints"] as const)("renders %s", (s) => {
    show(s);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByRole("contentinfo").textContent).toContain("S09");
  });

  it("sprints follows the project picked in the sidebar", async () => {
    show("sprints");
    await userEvent.click(screen.getByRole("button", { name: /Main Harness/ }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Main Harness");
  });

  it("project accordion lists recent sprints with status and chats without sprint", async () => {
    show("home");
    const btn = side().getByRole("button", { name: /Main Harness/ });
    await userEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    const sprints = within(side().getByRole("list", { name: "Sprints de Main Harness" }));
    const items = sprints.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toMatch(/S05.*Entregue/);
    expect(items[1]).toMatch(/S04.*Fechada/);
    const loose = within(side().getByRole("list", { name: "Chats sem sprint de Main Harness" }));
    expect(loose.getByText("dúvida handoff")).toBeTruthy();
    expect(loose.getByText("limite assinatura")).toBeTruthy();
    expect(loose.queryByText("Executar sprint S05")).toBeNull();
    await userEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("accordion shows at most the 5 latest sprints", async () => {
    const extra = ["S03", "S04", "S05", "S06", "S07"].map((id) => ({
      id,
      projectId: "dashboard-ia",
      title: `Sprint ${id}`,
      status: "planned" as const,
      tasks: [],
    }));
    show("home", vi.fn(), { ...data, sprints: [...data.sprints, ...extra] });
    const btn = side().getByRole("button", { name: /Dashboard IA/ });
    if (btn.getAttribute("aria-expanded") !== "true") await userEvent.click(btn);
    const items = within(side().getByRole("list", { name: "Sprints de Dashboard IA" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(items).toHaveLength(5);
    expect(items[0]).toMatch(/S07.*Planejada/);
    expect(items.join()).not.toMatch(/S01|S02/);
  });

  it("opens the timeline from the menu", async () => {
    show("home");
    await nav("Linha do tempo");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Linha do tempo");
    const lane = within(screen.getByRole("region", { name: "Dashboard IA" }));
    expect(lane.getAllByText("Clone 1").length).toBeGreaterThan(0);
    expect(lane.getByText(/fora da sprint/)).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "7 dias" }));
    expect(screen.getByRole("tab", { name: "7 dias" }).getAttribute("aria-selected")).toBe("true");
  });

  it("opens Ociosos from the menu and brings a project back", async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response("{}")));
    vi.stubGlobal("fetch", fetch);
    show("home");
    await nav(/Ociosos/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ociosos");
    const [back] = screen.getAllByRole("button", { name: "Trazer para ativos" });
    if (back) await userEvent.click(back);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/projects\/.+\/promote/),
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });

  it("Itens menu opens Chats, Sprints, Backlog, Roadmap and Documentos of the selected project", async () => {
    const onScreen = vi.fn();
    show("home", onScreen);
    const telas = within(screen.getByRole("navigation", { name: "Telas" }));
    expect(telas.queryByRole("button", { name: "Sprints" })).toBeNull();
    const itens = within(screen.getByRole("navigation", { name: "Itens" }));
    // Markdown bodies may bring their own h1; the page title is the first one.
    const h1 = () => screen.getAllByRole("heading", { level: 1 })[0]?.textContent;
    const main = () => within(screen.getByRole("main"));

    await userEvent.click(itens.getByRole("button", { name: "Chats" }));
    expect(h1()).toBe("Dashboard IA › Chats");
    expect(main().getByText("hook lento")).toBeTruthy();
    expect(main().getAllByText("sem sprint").length).toBeGreaterThan(0);

    await userEvent.click(itens.getByRole("button", { name: "Sprints" }));
    expect(onScreen).toHaveBeenCalledWith("sprints");
    expect(h1()).toContain("Sprints");

    await userEvent.click(itens.getByRole("button", { name: "Backlog" }));
    expect(h1()).toBe("Dashboard IA › Backlog");
    expect(screen.getByRole("region", { name: "Backlog" })).toBeTruthy();

    await userEvent.click(itens.getByRole("button", { name: "Roadmap" }));
    expect(screen.getByRole("region", { name: "Roadmap" })).toBeTruthy();

    await userEvent.click(itens.getByRole("button", { name: "Documentos" }));
    await userEvent.click(screen.getByRole("button", { name: /ADR 0001/ }));
    expect(screen.getByRole("heading", { level: 1, name: /ADR 0001/ })).toBeTruthy();

    await userEvent.click(side().getByRole("button", { name: /Main Harness/ }));
    expect(
      within(screen.getByRole("navigation", { name: "Itens" })).getByText(/Main Harness/),
    ).toBeTruthy();
  });
});
