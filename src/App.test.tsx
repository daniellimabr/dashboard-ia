import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { data } from "./data/mock";
import type { Data } from "./data/types";
import { renderAt } from "./test-utils";

/** Stubs fetch: GET /api/data answers `current()` (throws = network error); POST answers 204. */
const stubFetch = (current: () => Data) => {
  const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "POST" ? new Response(null, { status: 204 }) : Response.json(current()),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};
const poll = () => act(() => void document.dispatchEvent(new Event("visibilitychange")));

afterEach(() => void vi.unstubAllGlobals());

describe("routes", () => {
  it.each([
    ["/", "Início"],
    ["/controle", "Sala de controle"],
    ["/tempo", "Linha do tempo"],
    ["/ociosos", "Ociosos"],
  ])("%s is a menu screen with its own URL", (path, tab) => {
    renderAt(path);
    expect(
      screen.getByRole("link", { name: new RegExp(`^${tab}`) }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("shows both subscription limits on every screen", () => {
    renderAt("/tempo");
    screen.getByRole("meter", { name: "Limite 5 h" });
    screen.getByRole("meter", { name: "Semanal" });
    expect(screen.getAllByText(/^renova em /)).toHaveLength(2);
  });

  it("counts idle projects in the menu", () => {
    renderAt("/");
    screen.getByRole("link", { name: "Ociosos (2)" });
  });

  it("opens another project's items from the side menu", async () => {
    renderAt("/controle");
    await userEvent.click(screen.getByRole("button", { name: /Bot Telegram/ }));
    await userEvent.click(screen.getByRole("link", { name: "Chats" }));
    screen.getByRole("heading", { level: 1, name: "Bot Telegram › Chats" });
    expect(screen.getByRole("link", { name: "Chats" }).getAttribute("aria-current")).toBe("page");
  });

  it.each([
    ["/p/dashboard-ia/chats", "Dashboard IA › Chats"],
    ["/p/main-harness/sprints", "Main Harness › Sprints"],
    ["/p/x/chats", "Projeto não encontrado"],
    ["/nada", "Página não encontrada"],
  ])("%s renders", (path, title) => {
    renderAt(path);
    screen.getByRole("heading", { level: 1, name: title });
  });

  it("redirects a project to its chats tab", () => {
    renderAt("/p/dashboard-ia");
    expect(screen.getByRole("link", { name: "Chats" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("data from the server", () => {
  it("shows Carregando… until the first /api/data answer", async () => {
    const fetch = stubFetch(() => data);
    renderAt("/", null);
    screen.getByText("Carregando…");
    await screen.findByRole("link", { name: "Ociosos (2)" });
    expect(fetch).toHaveBeenCalledWith("/api/data");
  });

  it("keeps the last data and warns when the server stops answering", async () => {
    let down = false;
    stubFetch(() => {
      if (down) throw new TypeError("Failed to fetch");
      return data;
    });
    renderAt("/", null);
    await screen.findByRole("link", { name: "Ociosos (2)" });
    expect(screen.queryByText(/Sem conexão com o servidor/)).toBeNull();
    down = true;
    await poll();
    await screen.findByText(/^Sem conexão com o servidor desde \d\d:\d\d\./);
    screen.getByRole("link", { name: "Ociosos (2)" });
    down = false;
    await poll();
    await vi.waitFor(() => expect(screen.queryByText(/Sem conexão com o servidor/)).toBeNull());
  });

  it("promotes through the server and shows its new state", async () => {
    const user = userEvent.setup();
    let current = data;
    const fetch = stubFetch(() => current);
    renderAt("/ociosos", null);
    const [first] = await screen.findAllByRole("button", { name: "Trazer para ativos" });
    current = {
      ...data,
      projects: data.projects.map((p) => (p.id === "bot-telegram" ? { ...p, promoted: true } : p)),
    };
    await user.click(first as HTMLElement);
    expect(fetch).toHaveBeenCalledWith("/api/projects/bot-telegram/promote", { method: "POST" });
    await screen.findByRole("link", { name: "Ociosos (1)" });
    within(
      within(screen.getByRole("navigation", { name: "Projetos" })).getAllByRole(
        "list",
      )[0] as HTMLElement,
    ).getByText("Bot Telegram");
  });

  it("polls every 5 s and pauses while the tab is hidden", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      const fetch = stubFetch(() => data);
      renderAt("/", null);
      await screen.findByRole("link", { name: "Ociosos (2)" });
      expect(fetch).toHaveBeenCalledTimes(1);
      await act(() => void vi.advanceTimersByTime(5000));
      expect(fetch).toHaveBeenCalledTimes(2);
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      await poll();
      await act(() => void vi.advanceTimersByTime(20_000));
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      Reflect.deleteProperty(document, "visibilityState");
      vi.useRealTimers();
    }
  });

  it("marks estimated 5 h limits and a missing weekly limit", () => {
    renderAt("/", {
      ...data,
      limits: { h5: { pct: 40, estimated: true }, h5Usd: data.limits.h5Usd },
    });
    screen.getByText("estimado");
    expect(screen.queryByText(/^renova em /)).toBeNull();
    expect(screen.getByRole("meter", { name: "Semanal" }).getAttribute("aria-valuetext")).toBe(
      "sem dado",
    );
  });
});
