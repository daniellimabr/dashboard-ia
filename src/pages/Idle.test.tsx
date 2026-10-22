import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderAt } from "../test-utils";

describe("Idle (Ociosos)", () => {
  it("lists idle projects with sprint and days stopped, and brings one back", async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response("{}")));
    vi.stubGlobal("fetch", fetch);
    renderAt("/ociosos");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ociosos");
    const r = within(screen.getByRole("region", { name: /Ociosos \(2\)/ }));
    expect(r.getByText("Bot Telegram")).toBeTruthy();
    expect(r.getByText("S04 · parado há 9 dias")).toBeTruthy();
    expect(r.getByText("sem sprint · parado há 23 dias")).toBeTruthy();
    const [back] = r.getAllByRole("button", { name: "Trazer para ativos" });
    if (back) await userEvent.click(back);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/projects\/.+\/promote/),
      expect.anything(),
    );
    vi.unstubAllGlobals();
  });
});
