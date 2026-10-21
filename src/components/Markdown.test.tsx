import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders headings and lists", () => {
    render(<Markdown source={"# Title\n\n- one\n- two"} />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
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
