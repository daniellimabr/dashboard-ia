// Draft switcher (S08): each direction lives in src/drafts/<x>/index.tsx and exports `Draft`.
import { useState, type ComponentType, type CSSProperties } from "react";

export type Screen = "home" | "components" | "control" | "sprints";
export type DraftComponent = ComponentType<{ screen: Screen; onScreen: (s: Screen) => void }>;

const SCREENS: [Screen, string][] = [
  ["home", "Tela principal"],
  ["components", "Componentes"],
  ["control", "Sala de controle"],
  ["sprints", "Sprints"],
];

const found = import.meta.glob<{ Draft: DraftComponent }>("./*/index.tsx", { eager: true });
const discovered = Object.fromEntries(
  Object.entries(found).map(([path, m]) => [path.split("/")[1], m.Draft]),
);

const bar: CSSProperties = {
  position: "fixed",
  top: 8,
  right: 8,
  zIndex: 1000,
  display: "flex",
  gap: 4,
  padding: 4,
  borderRadius: 8,
  background: "rgba(0,0,0,.75)",
  font: "12px system-ui, sans-serif",
};
const btn = (on: boolean): CSSProperties => ({
  border: 0,
  borderRadius: 6,
  padding: "4px 8px",
  cursor: "pointer",
  color: on ? "#000" : "#fff",
  background: on ? "#fff" : "transparent",
});

export function Drafts({
  directions = discovered,
}: {
  directions?: Record<string, DraftComponent>;
}) {
  const keys = Object.keys(directions).sort();
  const [dir, setDir] = useState(keys[0] ?? "");
  const [screen, setScreen] = useState<Screen>("home");
  const Draft = directions[dir];

  return (
    <>
      <nav style={bar} aria-label="Drafts">
        {keys.map((k) => (
          <button key={k} style={btn(k === dir)} aria-pressed={k === dir} onClick={() => setDir(k)}>
            {k.toUpperCase()}
          </button>
        ))}
        <span style={{ width: 8 }} />
        {SCREENS.map(([s, label]) => (
          <button
            key={s}
            style={btn(s === screen)}
            aria-pressed={s === screen}
            onClick={() => setScreen(s)}
          >
            {label}
          </button>
        ))}
      </nav>
      {Draft ? <Draft screen={screen} onScreen={setScreen} /> : <p>Nenhuma direção ainda.</p>}
    </>
  );
}
