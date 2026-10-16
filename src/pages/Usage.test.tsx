import { formatUsd } from "../lib/format";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { data } from "../data/mock";
import { renderAt } from "../test-utils";

describe("Usage page", () => {
  it("shows the project's US$ total and a 14-bar chart", () => {
    renderAt("/p/dashboard-ia/usage");
    const total = data.usage
      .filter((u) => u.projectId === "dashboard-ia")
      .reduce((s, u) => s + u.usd, 0);
    expect(screen.getByTestId("usage-usd").textContent).toBe(formatUsd(total));
    const chart = screen.getByRole("img", { name: /US\$ por dia/ });
    expect(chart.querySelectorAll("rect")).toHaveLength(14);
  });

  it("compares all projects", () => {
    renderAt("/p/dashboard-ia/usage");
    expect(screen.getAllByRole("row")).toHaveLength(1 + data.projects.length);
  });
});
