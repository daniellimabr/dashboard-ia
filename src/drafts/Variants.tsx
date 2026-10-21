import { useState, type ReactNode } from "react";
import { NavLink } from "react-router";

// S06 drafts: throwaway screens for Daniel to pick a variant; delete after the next sprint implements them.
const links = [
  ["/rascunho/controle", "Sala de controle"],
  ["/p/dashboard-ia/rascunho/chats", "Chats"],
  ["/p/dashboard-ia/rascunho/sprints", "Sprints"],
  ["/p/dashboard-ia/rascunho/docs", "Documentos"],
  ["/p/dashboard-ia/rascunho/backlog", "Backlog"],
  ["/p/dashboard-ia/rascunho/roadmap", "Roadmap"],
  ["/p/dashboard-ia/rascunho/usage", "Consumo"],
] as const;

export function Variants({ a, b, sources }: { a: ReactNode; b: ReactNode; sources: ReactNode }) {
  const [v, setV] = useState<"A" | "B">("A");
  return (
    <>
      <nav className="tabs" aria-label="Rascunhos">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="tabs" role="group" aria-label="Variante">
        {(["A", "B"] as const).map((x) => (
          <button
            key={x}
            type="button"
            className={v === x ? "active" : ""}
            aria-pressed={v === x}
            onClick={() => setV(x)}
          >
            Variante {x}
          </button>
        ))}
      </div>
      {v === "A" ? a : b}
      <footer className="muted">
        <h3>De onde vem cada dado · o que falta</h3>
        {sources}
      </footer>
    </>
  );
}
