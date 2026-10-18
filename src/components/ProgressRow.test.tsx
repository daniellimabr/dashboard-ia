import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProgressRow } from "./ProgressRow";

describe("ProgressRow", () => {
  it("shows %, right text and the planned time apart", () => {
    render(
      <ProgressRow
        title="T03 Sala"
        right="14:38 → agora · 12 min"
        pct={40}
        below="previsto 40 min"
      />,
    );
    screen.getByText("40%");
    screen.getByText("14:38 → agora · 12 min");
    screen.getByText("previsto 40 min");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens and closes its children, by mouse and keyboard", async () => {
    const user = userEvent.setup();
    render(
      <ProgressRow title="Timeline" sub="dependências">
        <p>gantt aqui</p>
      </ProgressRow>,
    );
    const btn = screen.getByRole("button", { name: /Timeline/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("gantt aqui")).toBeNull();
    await user.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    screen.getByText("gantt aqui");
    btn.focus();
    await user.keyboard("{Enter}");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("can start open", () => {
    render(
      <ProgressRow title="Horários" defaultOpen>
        <p>tabela</p>
      </ProgressRow>,
    );
    screen.getByText("tabela");
  });
});
