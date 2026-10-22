// Parallel page for the S08 drafts; the real panel at / is untouched.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { DataProvider } from "../lib/useData";
import { Drafts } from "./Drafts";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <StrictMode>
    <MemoryRouter>
      <DataProvider>
        <Drafts />
      </DataProvider>
    </MemoryRouter>
  </StrictMode>,
);
