import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spark } from "./Spark";

describe("Spark", () => {
  it("draws a fixed-size line over the values", () => {
    render(<Spark values={[0, 2, 1]} label="gasto dos últimos 7 dias" />);
    const svg = screen.getByRole("img", { name: "gasto dos últimos 7 dias" });
    expect(svg.getAttribute("width")).toBe("140");
    expect(svg.querySelector("polyline")?.getAttribute("points")).toBe("0,33 70,5 140,19");
  });
});
