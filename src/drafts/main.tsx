import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { data } from "../data/mock";
import { DataProvider } from "../lib/useData";
import "../styles.css";
import "./drafts.css";
import { DraftRoutes } from "./routes";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");
createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <DataProvider initial={data}>
        <DraftRoutes />
      </DataProvider>
    </HashRouter>
  </StrictMode>,
);
