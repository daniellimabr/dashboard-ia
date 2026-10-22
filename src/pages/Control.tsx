import { useState } from "react";
import { Link } from "react-router";
import { Gantt } from "../components/Gantt";
import { ProgressRow } from "../components/ProgressRow";
import { Spark } from "../components/Spark";
import { STEPS, type Agent, type Project, type Sprint, type Task } from "../data/types";
import { formatTokens, formatUsd } from "../lib/format";
import { agentLabel, currentWave, sprintPct, taskPct, taskStatus } from "../lib/progress";
import { runningAgents } from "../lib/select";
import { durationMs, formatDuration, formatTime } from "../lib/time";
import { useBoard } from "../lib/useBoard";
import { useNow } from "../lib/useNow";
import css from "./Control.module.css";
import { useData } from "../lib/useData";

const MIN = 60_000;
const pctOf = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));
const barCls = (pct: number) => (pct >= 80 ? "bad" : pct >= 60 ? "warn" : "");
const span = (t: { startedAt?: string; endedAt?: string }, now: number) =>
  t.startedAt
    ? `${formatTime(t.startedAt)} → ${t.endedAt ? formatTime(t.endedAt) : "agora"} · ${formatDuration(durationMs(t.startedAt, t.endedAt, now))}`
    : "não começou";

function TaskRow({ t, agents, now }: { t: Task; agents: Agent[]; now: number }) {
  const st = taskStatus(t);
  const n = t.done ? STEPS.length : (t.steps ?? 0);
  const ag = agents.find((a) => a.task === t.id);
  const who = ag ? agentLabel(ag.kind, ag.name) : t.agent && agentLabel(t.agent);
  return (
    <ProgressRow
      level={2}
      wave={t.wave}
      title={
        <>
          {who && (
            <span
              className={`av ${ag ? "on" : ""}`}
              title={ag ? `${ag.name} executando agora` : t.agent}
            >
              {who}
            </span>
          )}
          <span className="mono">{t.id}</span> {t.title}
        </>
      }
      right={span(t, now)}
      pct={taskPct(t)}
      chips={
        <>
          {t.wave && <span className="chip w">onda {t.wave}</span>}
          {STEPS.map((s, j) =>
            j < n ? (
              <span key={s} className="chip ok">
                {s}
              </span>
            ) : j === n && st === "failed" ? (
              <span key={s} className="chip bad">
                {s} ✕
              </span>
            ) : j === n && st === "running" ? (
              <span key={s} className="chip run">
                {s} …
              </span>
            ) : (
              <span key={s} className="chip">
                {s}
              </span>
            ),
          )}
        </>
      }
      below={t.plan && `previsto ${t.plan.duration} min`}
    />
  );
}

const STATUS = { active: "Em execução", planned: "Planejada", closed: "Concluída" };

function Column({ p, now }: { p: Project; now: number }) {
  const { data } = useData();
  const initial: Sprint | undefined =
    data.sprints.find((s) => s.projectId === p.id && s.status === "active") ??
    data.sprints.find((s) => s.projectId === p.id && s.status === "planned") ??
    data.sprints
      .filter((s) => s.projectId === p.id && s.status === "closed")
      .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))[0];
  // most recent first; numeric compare so S10 > S09
  const recent = data.sprints
    .filter((s) => s.projectId === p.id)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
    .slice(0, 5);
  const [picked, setPicked] = useState(initial?.id);
  const sprint = recent.find((s) => s.id === picked) ?? initial;
  const agents = runningAgents(data, p.id);
  const adhoc = data.chats
    .filter((c) => c.projectId === p.id && !c.sprintId)
    .flatMap((c) => c.tasks.map((t) => ({ t, chat: c.title })));
  const usage = data.usage.filter((u) => u.projectId === p.id).slice(-7);
  const today = usage.at(-1);
  const h5 = data.limits.h5Usd;

  const tasks = sprint?.tasks ?? [];
  const done = tasks.filter((t) => t.done).length;
  const start = sprint?.startedAt;
  const end = sprint?.deliveredAt;
  const runMs = start ? durationMs(start, end, now) : 0;
  const planMs = (sprint?.plannedMin ?? 0) * MIN;
  const running = sprint?.status === "active" && start && !end;
  const wave = currentWave(tasks);
  const fails = tasks.filter((t) => t.review === "fail").length;
  const adhocRun = adhoc.filter(({ t }) => !t.done).length;
  const sprintRun = tasks.some((t) => taskStatus(t) === "running");

  return (
    <section className="col">
      <header>
        <h2>
          <Link to={`/p/${p.id}`}>{p.name}</Link>
        </h2>
        {p.phase && (
          <span className={`pill p-${p.phase.tone} ${p.phase.live ? "live" : ""}`}>
            {p.phase.label}
          </span>
        )}
        {sprint && (
          <Link className="mono" to={`/p/${p.id}/sprints/${sprint.id}`}>
            {sprint.id}
          </Link>
        )}
        {sprint?.status === "closed" && <span className="pill p-ok">Concluída</span>}
      </header>
      {recent.length > 1 && (
        <div className="tabs" role="tablist" aria-label={`Sprints de ${p.name}`}>
          {recent.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === sprint?.id}
              className={s.id === sprint?.id ? "active" : ""}
              title={s.title}
              onClick={() => setPicked(s.id)}
            >
              {`${s.id} · ${STATUS[s.status]}`}
            </button>
          ))}
        </div>
      )}
      {p.alerts?.map((a) => (
        <div key={a.title} className={`${css.alert} ${a.tone === "warn" ? css.w : ""}`}>
          <b>{a.title}</b>
          <span className="muted">{a.detail}</span>
        </div>
      ))}
      {/* key: remount per sprint so the accordions reopen with that sprint's defaults */}
      <div key={sprint?.id} className={css.trk}>
        {sprint && (
          <ProgressRow
            title="Horários"
            sub="início, fim e andamento das tarefas"
            right={`${done}/${tasks.length} feitas · ${
              start
                ? `${formatTime(start)} → ${end ? formatTime(end) : "em curso"} · ${formatDuration(runMs)}`
                : "não começou"
            }`}
          >
            <table className={css.times}>
              <thead>
                <tr>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Corrido</th>
                  <th>Previsto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{start ? formatTime(start) : "—"}</td>
                  <td>
                    {end ? (
                      formatTime(end)
                    ) : start ? (
                      <span className={css.live}>em curso</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{start ? formatDuration(runMs) : "—"}</td>
                  <td>
                    {formatDuration(planMs)}
                    {start && !end && (
                      <span className="muted">
                        até {formatTime(new Date(Date.parse(start) + planMs).toISOString())}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            <div className={css.pad}>
              <Gantt tasks={tasks} now={now} live={!!running} />
            </div>
            <ProgressRow
              level={2}
              title="Duração corrida"
              right={`${start ? formatDuration(runMs) : "0 min"} de ${formatDuration(planMs)}`}
              pct={planMs ? pctOf(runMs, planMs) : 0}
            />
          </ProgressRow>
        )}
        {adhoc.length > 0 && (
          <ProgressRow
            defaultOpen={adhocRun > 0}
            title="Fora da sprint"
            sub="tarefas de chats sem sprint"
            right={`${adhoc.length} tarefa${adhoc.length > 1 ? "s" : ""}${adhocRun ? ` · ${adhocRun} rodando` : ""}`}
          >
            {adhoc.map(({ t, chat }) => (
              <ProgressRow
                key={`${chat}:${t.id}`}
                level={2}
                title={
                  <>
                    {t.agent && (
                      <span className={`av ${t.done ? "" : "on"}`}>{agentLabel(t.agent)}</span>
                    )}
                    {t.title}
                  </>
                }
                sub={chat}
                right={span(t, now)}
                chips={
                  t.done ? (
                    <span className="chip ok">feita</span>
                  ) : (
                    <span className="chip run">rodando</span>
                  )
                }
              />
            ))}
          </ProgressRow>
        )}
        {sprint && (
          <ProgressRow
            defaultOpen={sprintRun}
            title="Itens da sprint"
            sub={`${sprint.id} · ${sprint.title}${sprint.goal ? ` — ${sprint.goal}` : ""}`}
            right={`${done}/${tasks.length} feitas${start ? ` · corrido ${formatDuration(runMs)}` : ""}`}
            pct={sprintPct(tasks)}
            chips={
              <>
                <span className="chip">{formatUsd(sprint.usd ?? 0)}</span>
                <span className={`chip ${fails ? "bad" : ""}`}>{fails} reprov.</span>
                <span className="chip">
                  onda {wave.current} de {wave.total}
                </span>
              </>
            }
            below={`previsto ${formatDuration(planMs)}`}
          >
            {tasks.map((t) => (
              <TaskRow key={t.id} t={t} agents={agents} now={now} />
            ))}
          </ProgressRow>
        )}
        <ProgressRow
          title="Agentes"
          sub="quem está trabalhando agora"
          right={
            agents.length
              ? `${agents.length} rodando · contexto máx. ${Math.max(...agents.map((a) => a.contextPct ?? 0))}%`
              : "nenhum rodando"
          }
        >
          {agents.length ? (
            <table className={css.agents}>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="pill p-run live">{a.name}</span>
                    </td>
                    <td className="muted">{a.doing}</td>
                    <td className="r mono num">
                      {Math.floor(durationMs(a.startedAt, undefined, now) / MIN)}m
                    </td>
                    <td className="r">
                      <div className={`bar ${css.ctx}`} title={`contexto ${a.contextPct ?? 0}%`}>
                        <i
                          className={barCls(a.contextPct ?? 0)}
                          style={{ width: `${a.contextPct ?? 0}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={`muted ${css.none}`}>nenhum agente rodando</p>
          )}
        </ProgressRow>
        <ProgressRow
          defaultOpen
          title="Consumo"
          sub="gasto de hoje e da sprint"
          right={`${formatUsd(today?.usd ?? 0)} hoje · ${pctOf(today?.usd ?? 0, h5)}% do limite 5 h`}
        >
          <div className={css.money}>
            <strong className="num">{formatUsd(today?.usd ?? 0)}</strong>
            <Spark values={usage.map((u) => u.usd)} label="gasto dos últimos 7 dias" />
            <span className="muted mono">{formatTokens(today?.tokens ?? 0)} tokens hoje</span>
          </div>
          {sprint && (
            <ProgressRow
              level={2}
              title="Gasto da sprint"
              right={`${formatUsd(sprint.usd ?? 0)} · limite 5 h`}
              pct={pctOf(sprint.usd ?? 0, h5)}
            />
          )}
        </ProgressRow>
      </div>
    </section>
  );
}

export function Control() {
  const { active } = useBoard();
  const now = useNow();
  return (
    <div className="cols">
      {active.map((p) => (
        <Column key={p.id} p={p} now={now} />
      ))}
    </div>
  );
}
