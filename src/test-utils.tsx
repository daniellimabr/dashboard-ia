import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "./App";
import { data } from "./data/mock";
import type { Data } from "./data/types";
import { DataProvider } from "./lib/useData";

/** Renders the whole app at `path`, e.g. renderAt("/p/dashboard-ia/chats"); no `initial` = fetches /api/data. */
export const renderAt = (path: string, initial: Data | null = data) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <DataProvider initial={initial ?? undefined}>
        <AppRoutes />
      </DataProvider>
    </MemoryRouter>,
  );
