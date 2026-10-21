import { useState } from "react";
import type { Project, Sprint } from "../data/types";
import { Column } from "./ControlColumn";
import { formatDate, formatTime } from "../lib/time";
import { useBoard } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";
import { Variants } from "./Variants";

const RECENT = 5;

// shortcut: "desde" uses sprint.startedAt / deliveredAt / project.lastActivityAt; real events come later.
function State({ s, p }: { s?: Sprint; p: Project }) {
  if (s?.status === "closed") return <span className="pill p-ok">Concluída</span>;
  if (s?.deliveredAt)
    return (
      <span className="pill p-warn">
        Aguardando revisão de Daniel desde {formatTime(s.deliveredAt)}
      </span>
    );
  if (s?.status === "active" && s.startedAt)
    return <span className="pill p-run live">Em execução desde {formatTime(s.startedAt)}</span>;
  return <span className="pill">Ocioso desde {formatTime(p.lastActivityAt)}</span>;
}

const when = (s: Sprint) =>
  s.status === "closed"
    ? `concluída ${s.closedAt ? formatDate(s.closedAt) : ""}`
    : s.status === "active"
      ? "em curso"
      : "planejada";

function SprintColumn({ p, variant }: { p: Project; variant: "A" | "B" }) {
  const { data } = useData();
  const now = useNow();
  // most recent first; ids are per project, so S10 > S09 needs the numeric compare
  const sprints = data.sprints
    .filter((s) => s.projectId === p.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
    .slice(0, RECENT);
  const [id, setId] = useState((sprints.find((s) => s.status !== "closed") ?? sprints[0])?.id);
  const s = sprints.find((x) => x.id === id);
  const tabs = (
    <div>
      <div className="tabs" role="tablist" aria-label={`Sprints de ${p.name}`}>
        {sprints.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === id}
            className={x.id === id ? "active" : ""}
            title={x.title}
            onClick={() => setId(x.id)}
          >
            <span className="mono">{x.id}</span>
            {variant === "B" && <small className="muted"> · {when(x)}</small>}
          </button>
        ))}
      </div>
      <p>
        <State s={s} p={p} /> {variant === "B" && s && <span className="muted">{s.title}</span>}
      </p>
    </div>
  );
  // key: remount per sprint so the accordions reopen with that sprint's defaults
  return <Column key={id} p={p} now={now} pick={s} tabs={tabs} />;
}

const Room = ({ variant }: { variant: "A" | "B" }) => (
  <div className="cols">
    {useBoard().active.map((p) => (
      <SprintColumn key={`${p.id}-${variant}`} p={p} variant={variant} />
    ))}
  </div>
);

export function ControlDraft() {
  return (
    <Variants
      a={<Room variant="A" />}
      b={<Room variant="B" />}
      sources={
        <ul>
          <li>
            <b>Abas de sprint:</b> as {RECENT} sprints mais recentes do projeto (eventos do harness
            + <span className="mono">docs/sprints</span>), inclusive fechadas. Clicar numa aba troca
            Horários, Itens da sprint e o gasto da sprint para aquela sprint. A = só o id; B = id +
            situação e título. Já existe.
          </li>
          <li>
            <b>Selo de estado:</b> “Em execução desde” = início da sprint; “Aguardando revisão de
            Daniel desde” = entrega da sprint; “Ocioso desde” = última atividade do projeto;
            “Concluída” = sprint fechada. <b>Falta:</b> evento de entrega para o “aguardando revisão
            desde” ser exato.
          </li>
          <li>
            <b>Fora da sprint:</b> tarefas de chats sem sprint, logo abaixo da janela da sprint.{" "}
            <b>Falta:</b> título do chat (pedido ao harness de 2026-10-21).
          </li>
          <li>
            <b>Agentes e consumo:</b> mesmos dados da Sala de controle atual.
          </li>
        </ul>
      }
    />
  );
}
