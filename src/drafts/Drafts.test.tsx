import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { data } from "../data/mock";
import { DataProvider } from "../lib/useData";
import { Drafts, type DraftComponent } from "./Drafts";

const fake =
  (name: string): DraftComponent =>
  ({ screen: s, onScreen }) => (
    <div>
      <p>{`${name}:${s}`}</p>
      <button onClick={() => onScreen("control")}>{`${name} menu`}</button>
    </div>
  );

const renderDrafts = () =>
  render(
    <DataProvider initial={data}>
      <Drafts directions={{ a: fake("A"), b: fake("B") }} />
    </DataProvider>,
  );

test("starts on direction A, home screen", () => {
  renderDrafts();
  screen.getByText("A:home");
});

test("switches direction and screen", () => {
  renderDrafts();
  fireEvent.click(screen.getByRole("button", { name: "B" }));
  fireEvent.click(screen.getByRole("button", { name: "Sprints" }));
  screen.getByText("B:sprints");
});

test("the draft's own menu changes the screen", () => {
  renderDrafts();
  fireEvent.click(screen.getByRole("button", { name: "A menu" }));
  screen.getByText("A:control");
  expect(
    screen.getByRole("button", { name: "Sala de controle" }).getAttribute("aria-pressed"),
  ).toBe("true");
});
