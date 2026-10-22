import { useState } from "react";
import { splitIdle } from "../../lib/idle";
import { durationMs, formatDuration, formatTime, formatWeekday } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./a.module.css";
import { Control, Home, Sheet, Sprints } from "./screens";
import { Meter } from "./ui";

export type Screen = "home" | "components" | "control" | "sprints";

const MENU: [Screen, string][] = [
  ["home", "Principal"],
  ["control", "Sala de controle"],
  ["sprints", "Sprints"],
  ["components", "Componentes"],
];

export function Draft({ screen, onScreen }: { screen: Screen; onScreen: (s: Screen) => void }) {
  const { data, offlineSince } = useData();
  const now = useNow();
  const [light, setLight] = useState(false);
  const [promoted, setPromoted] = useState<string[]>([]);
  const [pid, setPid] = useState(data.projects[0]?.id ?? "");
  const project = data.projects.find((p) => p.id === pid) ?? data.projects[0];
  // shortcut: "Trazer para ativos" is local to the draft; S09 keeps the real POST from Layout
  const board = splitIdle(
    data.projects,
    now,
    new Set([...data.projects.filter((p) => p.promoted).map((p) => p.id), ...promoted]),
  );
  const { h5, week } = data.limits;
  return (
    <div className={`${s.root} ${light ? s.light : ""}`}>
      <header className={s.bar}>
        <span className={s.brand}>Painel IA</span>
        <nav className={s.menu} aria-label="Telas">
          {MENU.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-current={k === screen ? "page" : undefined}
              onClick={() => onScreen(k)}
            >
              {label}
            </button>
          ))}
        </nav>
        <label className={s.pick}>
          <span>Projeto</span>
          <select aria-label="Projeto" value={pid} onChange={(e) => setPid(e.target.value)}>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className={s.limits}>
          <span>
            5 h
            <Meter label="Limite 5 h" pct={h5.pct} />
            <small>
              {h5.estimated || !h5.resetsAt
                ? "estimado"
                : formatDuration(durationMs(new Date(now).toISOString(), h5.resetsAt))}
            </small>
          </span>
          <span>
            Semana
            <Meter label="Limite semanal" pct={week?.pct} />
            <small>
              {week?.resetsAt
                ? `${formatWeekday(week.resetsAt)} ${formatTime(week.resetsAt)}`
                : "sem dado"}
            </small>
          </span>
        </div>
        <button
          type="button"
          className={s.btn}
          aria-label={light ? "Tema escuro" : "Tema claro"}
          onClick={() => setLight(!light)}
        >
          {light ? "Escuro" : "Claro"}
        </button>
      </header>
      {offlineSince !== undefined && (
        <p className={s.offline} role="status">
          Sem conexão com o servidor desde {formatTime(new Date(offlineSince).toISOString())}. Os
          números param nesse horário e voltam sozinhos quando o servidor responder.
        </p>
      )}
      <main className={s.main}>
        {screen === "home" && (
          <Home
            active={board.active}
            idle={board.idle}
            onPromote={(id) => setPromoted((xs) => [...xs, id])}
          />
        )}
        {screen === "control" && <Control active={board.active} />}
        {screen === "sprints" && project && <Sprints project={project} />}
        {screen === "components" && <Sheet />}
      </main>
      <footer className={s.foot}>
        <p>
          <b>A · Operação densa.</b> Painel de operação escuro: cada projeto vira uma linha com tudo
          à vista (sprint, tarefa, fase, %, gasto, chats, alertas); números em mono, alinhados.
        </p>
        <p>
          <b>Navegação:</b> uma barra só no topo com telas, projeto e limites; Bem-vindo e Ociosos
          viram uma tela principal; Sprints segue o projeto escolhido na barra.
        </p>
        <p>
          <b>Custo na S09:</b> médio. Troca tokens e moldura, a tela principal substitui 2 rotas;
          Sala de controle e Sprints reaproveitam os componentes desta folha.
        </p>
      </footer>
    </div>
  );
}
