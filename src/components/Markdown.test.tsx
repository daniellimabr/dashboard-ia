import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders headings and lists", () => {
    render(<Markdown source={"# Title\n\n- one\n- two"} />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("rewrites links via `link` and escapes broken-link text", () => {
    const { container } = render(
      <Markdown
        source={"[a](a.md) [b<i>x</i>](b.md) [c](c.md)"}
        link={(h) => (h === "a.md" ? "/to/a" : h === "b.md" ? null : undefined)}
      />,
    );
    expect(screen.getByRole("link", { name: "a" }).getAttribute("href")).toBe("/to/a");
    expect(screen.getByRole("link", { name: "c" }).getAttribute("href")).toBe("c.md");
    expect(container.querySelector("i")).toBeNull();
    expect(container.textContent).toContain("(não encontrado)");
  });

  it("strips scripts, event handlers and javascript: links", () => {
    const { container } = render(
      <Markdown
        source={
          '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))'
        }
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
  });
});
