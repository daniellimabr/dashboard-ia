import { useState } from "react";
import { Link } from "react-router";
import { Gantt } from "../components/Gantt";
import { ProgressRow } from "../components/ProgressRow";
import { Spark } from "../components/Spark";
import type { Project, Sprint } from "../data/types";
import css from "../pages/Control.module.css";
import { formatUsd } from "../lib/format";
import { agentLabel, sprintPct, taskStatus } from "../lib/progress";
import { runningAgents } from "../lib/select";
import { durationMs, formatDuration, formatTime } from "../lib/time";
import { useBoard } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";
import { Variants } from "./Variants";

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

function Column({ p, variant }: { p: Project; variant: "A" | "B" }) {
  const { data } = useData();
  const now = useNow();
  // most recent first; ids are per project, so S10 > S09 needs the numeric compare
  const sprints = data.sprints
    .filter((s) => s.projectId === p.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  const [id, setId] = useState((sprints.find((s) => s.status !== "closed") ?? sprints[0])?.id);
  const s = sprints.find((x) => x.id === id);
  const tasks = s?.tasks ?? [];
  const done = tasks.filter((t) => t.done).length;
  const open = data.chats.filter((c) => c.projectId === p.id && !c.sprintId && !c.endedAt);
  const agents = runningAgents(data, p.id);
  const usage = data.usage.filter((u) => u.projectId === p.id).slice(-7);

  const chats = open.length > 0 && (
    <ProgressRow
      defaultOpen
      title="Conversas em andamento"
      sub="fora de sprint"
      right={`${open.length} aberta${open.length > 1 ? "s" : ""}`}
    >
      {open.map((c) => (
        <ProgressRow
          key={c.id}
          level={2}
          title={
            <>
              <span className="av on">{agentLabel("tech-lead")}</span>
              {c.title}
            </>
          }
          sub={c.tasks.map((t) => t.title).join(" · ")}
          right={`desde ${formatTime(c.startedAt)} · ${formatDuration(durationMs(c.startedAt, undefined, now))}`}
          chips={<span className="chip run">rodando</span>}
        />
      ))}
    </ProgressRow>
  );

  return (
    <section className="col">
      <header>
        <h2>
          <Link to={`/p/${p.id}`}>{p.name}</Link>
        </h2>
        {variant === "A" && (
          <select aria-label="Sprint" value={id} onChange={(e) => setId(e.target.value)}>
            {sprints.map((x) => (
              <option key={x.id} value={x.id}>
                {x.id} · {x.title}
              </option>
            ))}
          </select>
        )}
        <State s={s} p={p} />
      </header>
      {variant === "B" && (
        <div className="tabs" role="group" aria-label="Sprints">
          {sprints.map((x) => (
            <button
              key={x.id}
              type="button"
              className={x.id === id ? "active" : ""}
              aria-pressed={x.id === id}
              title={x.title}
              onClick={() => setId(x.id)}
            >
              {x.id}
            </button>
          ))}
        </div>
      )}
      <div className={css.trk}>
        {variant === "B" && chats}
        {s && (
          <ProgressRow
            defaultOpen
            title="Itens da sprint"
            sub={`${s.id} · ${s.title}`}
            right={`${done}/${tasks.length} feitas`}
            pct={sprintPct(tasks)}
            chips={<span className="chip">{formatUsd(s.usd ?? 0)}</span>}
          >
            <div className={css.pad}>
              <Gantt tasks={tasks} now={now} live={s.status === "active" && !s.deliveredAt} />
            </div>
            {tasks.map((t) => (
              <ProgressRow
                key={t.id}
                level={2}
                wave={t.wave}
                title={
                  <>
                    <span className="mono">{t.id}</span> {t.title}
                  </>
                }
                chips={
                  <span
                    className={`chip ${t.done ? "ok" : taskStatus(t) === "running" ? "run" : ""}`}
                  >
                    {t.done ? "feita" : taskStatus(t) === "running" ? "rodando" : "pendente"}
                  </span>
                }
              />
            ))}
          </ProgressRow>
        )}
        {variant === "A" && chats}
        <ProgressRow
          title="Agentes"
          right={agents.length ? `${agents.length} rodando` : "nenhum rodando"}
        >
          {agents.map((a) => (
            <p key={a.id}>
              <span className="pill p-run live">{a.name}</span>{" "}
              <span className="muted">{a.doing}</span>
            </p>
          ))}
        </ProgressRow>
        <ProgressRow title="Consumo" right={`${formatUsd(usage.at(-1)?.usd ?? 0)} hoje`}>
          <div className={css.money}>
            <Spark values={usage.map((u) => u.usd)} label="gasto dos últimos 7 dias" />
          </div>
        </ProgressRow>
      </div>
    </section>
  );
}

const Room = ({ variant }: { variant: "A" | "B" }) => (
  <div className="cols">
    {useBoard().active.map((p) => (
      <Column key={p.id} p={p} variant={variant} />
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
            <b>Sprints (seletor/lista):</b> eventos <span className="mono">sprint</span> do harness,
            mais recente primeiro, inclusive fechadas. Já existe.
          </li>
          <li>
            <b>Selo de estado:</b> “Em execução desde” = início da sprint; “Aguardando revisão de
            Daniel desde” = entrega da sprint; “Ocioso desde” = última atividade do projeto;
            “Concluída” = sprint fechada. <b>Falta:</b> evento de entrega por tarefa/sprint para o
            “aguardando revisão desde” ser exato.
          </li>
          <li>
            <b>Conversas em andamento fora de sprint:</b> chats sem sprint e sem fim. <b>Falta:</b>{" "}
            título do chat (pedido ao harness de 2026-10-21); hoje vem do primeiro pedido.
          </li>
          <li>
            <b>Agentes e consumo:</b> mesmos dados da Sala de controle atual.
          </li>
        </ul>
      }
    />
  );
}
