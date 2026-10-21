import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "./App";
import { data } from "./data/mock";
import type { ComponentType } from "react";
import type { Data } from "./data/types";
import { DataProvider } from "./lib/useData";

/** Renders the whole app at `path`, e.g. renderAt("/p/dashboard-ia/chats"); no `initial` = fetches /api/data. */
export const renderAt = (
  path: string,
  initial: Data | null = data,
  Routes: ComponentType = AppRoutes,
) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <DataProvider initial={initial ?? undefined}>
        <Routes />
      </DataProvider>
    </MemoryRouter>,
  );
