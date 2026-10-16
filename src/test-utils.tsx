import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "./App";

/** Renders the whole app at `path`, e.g. renderAt("/p/dashboard-ia/chats"). */
export const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
