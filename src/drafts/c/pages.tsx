import { useState } from "react";
import { Markdown } from "../../components/Markdown";
import type { Chat, Data, Doc, Project, Sprint, Tone } from "../../data/types";
import { splitIdle } from "../../lib/idle";
import { durationMs, formatDate, formatDuration, formatTime } from "../../lib/time";
import { useData } from "../../lib/useData";
import { useNow } from "../../lib/useNow";
import s from "./c.module.css";
import p from "./pages.module.css";
import { Accordion, Empty, mainSprint, Panel, Pill, Tabs } from "./ui";

const H = 3_600_000;
const D = 24 * H;

export const promotedOf = (data: Data) =>
  new Set(data.projects.filter((x) => x.promoted).map((x) => x.id));

/** Sprint status as Daniel reads it in the menu. */
export function sprintState(x: Sprint): [string, Tone | undefined, boolean?] {
  if (x.status === "closed") return ["Fechada", undefined];
  if (x.deliveredAt) return ["Entregue", "warn"];
  if (x.status === "active") return ["Em execução", "run", true];
  return x.approvedAt ? ["Aprovada", "ok"] : ["Planejada", undefined];
}

export const recentSprints = (data: Data, projectId: string) =>
  data.sprints
    .filter((x) => x.projectId === projectId)
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
    .slice(0, 5);

/** 5 latest chats not tied to a sprint; once a chat gets a sprint plan it shows up as that sprint. */
export const looseChats = (data: Data, projectId: string) =>
  data.chats
    .filter((c) => c.projectId === projectId && !c.sprintId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

export function IdleList() {
  const { data, refresh } = useData();
  const now = useNow();
  const { idle } = splitIdle(data.projects, now, promotedOf(data));
  const promote = (id: string) =>
    void fetch(`/api/projects/${encodeURIComponent(id)}/promote`, { method: "POST" })
      .catch(() => {}) // offline: the next poll shows the real state
      .then(refresh);
  if (!idle.length)
    return (
      <Empty title="Nenhum projeto ocioso">Projetos parados há mais de 7 dias aparecem aqui.</Empty>
    );
  return (
    <ul className={s.idleList}>
      {idle.map((x) => (
        <li key={x.id}>
          <span>{x.name}</span>
          <span className={s.muted}>
            {mainSprint(data, x.id)?.id ?? "sem sprint"} · parado há{" "}
            {Math.floor((now - Date.parse(x.lastActivityAt)) / D)} dias
          </span>
          <button type="button" className={s.btn} data-kind="ghost" onClick={() => promote(x.id)}>
            Trazer para ativos
          </button>
        </li>
      ))}
    </ul>
  );
}

export function IdleScreen() {
  const { data } = useData();
  const n = splitIdle(data.projects, useNow(), promotedOf(data)).idle.length;
  return (
    <>
      <div className={s.pageHead}>
        <h1>Ociosos</h1>
        <p className={s.muted}>
          Projetos sem atividade há mais de 7 dias, ou além dos 3 mais ativos, saem da lista de
          ativos. Traga um de volta quando for retomar.
        </p>
      </div>
      <Panel title={`Ociosos (${n})`} wide>
        <IdleList />
      </Panel>
    </>
  );
}

const RANGES: ["day" | "week", string][] = [
  ["day", "Últimas 24 h"],
  ["week", "7 dias"],
];

export function TimelineScreen() {
  const { data } = useData();
  const now = useNow();
  const [range, setRange] = useState<"day" | "week">("day");
  const { active } = splitIdle(data.projects, now, promotedOf(data));
  const start = now - (range === "day" ? D : 7 * D);
  const pct = (x: number) => ((Math.max(x, start) - start) / (now - start)) * 100;
  const ticks = [0, 1, 2, 3, 4].map((i) => start + (i * (now - start)) / 4);
  const label = (x: number) => {
    const iso = new Date(x).toISOString();
    return range === "day" ? formatTime(iso) : formatDate(iso);
  };

  return (
    <>
      <div className={s.pageHead}>
        <h1>Linha do tempo</h1>
        <p className={s.muted}>Quem trabalhou em cada projeto, e quando.</p>
      </div>
      <div className={p.tlBar}>
        <Tabs label="Período" items={RANGES} value={range} onChange={setRange} />
        <div className={p.legend}>
          <span data-kind="tech-lead">Tech Lead</span>
          <span data-kind="clone">Clones</span>
          <span data-kind="reviewer">Reviewer</span>
          <span data-key="adhoc">contorno: fora da sprint</span>
          <span data-key="open">listrado: rodando agora</span>
        </div>
      </div>
      <div className={s.stack}>
        {active.map((x) => {
          const rows = data.chats
            .filter((c) => c.projectId === x.id)
            .flatMap((c) => c.agents.map((a) => ({ a, c })))
            .filter(({ a }) => (a.endedAt ? Date.parse(a.endedAt) : now) > start)
            .sort((m, n) => Date.parse(m.a.startedAt) - Date.parse(n.a.startedAt));
          const done = data.sprints
            .filter((y) => y.projectId === x.id)
            .flatMap((y) => y.tasks.map((t) => ({ t, y })))
            .filter(({ t }) => t.done && t.endedAt && Date.parse(t.endedAt) > start);
          return (
            <Panel
              key={x.id}
              label={x.name}
              title={x.name}
              aside={
                x.phase && (
                  <Pill tone={x.phase.tone} live={x.phase.live}>
                    {x.phase.label}
                  </Pill>
                )
              }
            >
              {rows.length ? (
                <div className={p.lanes}>
                  {rows.map(({ a, c }) => {
                    const from = pct(Date.parse(a.startedAt));
                    const to = pct(a.endedAt ? Date.parse(a.endedAt) : now);
                    return (
                      <div key={a.id} className={p.lane}>
                        <span className={p.who}>
                          <b>{a.name}</b>
                          <small className={s.muted}>
                            {c.sprintId
                              ? `${c.sprintId} · ${c.title}`
                              : `fora da sprint · ${c.title}`}
                          </small>
                        </span>
                        <div className={p.track}>
                          <i
                            data-kind={a.kind}
                            data-adhoc={!c.sprintId || undefined}
                            data-open={!a.endedAt || undefined}
                            title={`${a.name}: ${formatTime(a.startedAt)}, ${formatDuration(durationMs(a.startedAt, a.endedAt, now))}`}
                            style={{ left: `${from}%`, width: `${Math.max(0.6, to - from)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className={p.lane}>
                    <span className={p.who}>
                      <b>Entregas</b>
                      <small className={s.muted}>{done.length} tarefas feitas</small>
                    </span>
                    <div className={p.track} data-marks>
                      {done.map(({ t, y }) => (
                        <i
                          key={`${y.id}-${t.id}`}
                          data-mark
                          title={`${y.id} ${t.id} ${t.title}`}
                          style={{ left: `${pct(Date.parse(t.endedAt ?? ""))}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={p.axis}>
                    {ticks.map((k) => (
                      <span key={k}>{label(k)}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <Empty title="Nenhum agente nesse período">Troque para 7 dias para ver mais.</Empty>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}

export type Tab = "chats" | "backlog" | "roadmap" | "docs";
export const TABS: [Tab, string][] = [
  ["chats", "Chats"],
  ["backlog", "Backlog"],
  ["roadmap", "Roadmap"],
  ["docs", "Documentos"],
];

const when = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

function ChatsTab({ chats }: { chats: Chat[] }) {
  const now = useNow();
  if (!chats.length)
    return <Empty title="Nenhum chat ainda">Os chats do projeto aparecem aqui ao abrir.</Empty>;
  return (
    <div className={s.stack}>
      {[...chats]
        .sort(
          (a, b) =>
            Number(!b.endedAt) - Number(!a.endedAt) || b.startedAt.localeCompare(a.startedAt),
        )
        .map((c) => (
          <Accordion
            key={c.id}
            summary={
              <span className={p.chatSum}>
                <b>{c.title}</b>
                {c.endedAt ? (
                  <Pill>encerrado</Pill>
                ) : (
                  <Pill tone="run" live>
                    em andamento
                  </Pill>
                )}
                {c.sprintId ? (
                  <Pill tone="ok">{c.sprintId}</Pill>
                ) : (
                  <Pill tone="warn">sem sprint</Pill>
                )}
                <span className={s.muted}>
                  {when(c.startedAt)} · {formatDuration(durationMs(c.startedAt, c.endedAt, now))}
                </span>
              </span>
            }
          >
            <ul className={s.agents}>
              {c.agents.map((a) => (
                <li key={a.id}>
                  <span className={s.av}>{a.name.slice(0, 2)}</span>
                  <span>
                    {a.name}
                    <small className={s.muted}>
                      {a.task ? `${a.task} · ` : ""}
                      {a.doing ?? ""}
                    </small>
                  </span>
                  <span className={s.muted}>{a.endedAt ? "encerrado" : "rodando"}</span>
                </li>
              ))}
            </ul>
            {c.tasks.map((t) => (
              <p key={t.id}>
                <b>{t.id}</b> {t.title}{" "}
                <span className={s.muted}>{t.done ? "· feita" : "· aberta"}</span>
              </p>
            ))}
          </Accordion>
        ))}
    </div>
  );
}

const DOC_KINDS: [Doc["kind"], string][] = [
  ["sprint-plan", "Sprint plans"],
  ["release-report", "Release reports"],
  ["adr", "ADRs"],
  ["prd", "PRDs"],
  ["handoff", "Handoffs"],
];

function DocsTab({ docs }: { docs: Doc[] }) {
  const [id, setId] = useState<string>();
  const open = docs.find((d) => d.id === id);
  if (!docs.length)
    return <Empty title="Nenhum documento">Sprint plans, ADRs e PRDs aparecem aqui.</Empty>;
  return (
    <div className={p.docs}>
      <nav aria-label="Documentos" className={p.docList}>
        {DOC_KINDS.map(([kind, name]) => {
          const items = docs.filter((d) => d.kind === kind);
          return (
            items.length > 0 && (
              <div key={kind}>
                <span className={s.k}>{name}</span>
                {items.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-current={d.id === id || undefined}
                    onClick={() => setId(d.id)}
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            )
          );
        })}
      </nav>
      <article className={s.panel}>
        {open ? (
          <Markdown source={open.markdown} />
        ) : (
          <Empty title="Escolha um documento">Ele abre aqui, ao lado da lista.</Empty>
        )}
      </article>
    </div>
  );
}

export function ProjectScreen({ project: x, tab }: { project: Project; tab: Tab }) {
  const { data } = useData();
  const name = TABS.find(([t]) => t === tab)?.[1] ?? "";
  return (
    <>
      <div className={s.pageHead}>
        <h1>
          {x.name} › {name}
        </h1>
      </div>
      {tab === "chats" && <ChatsTab chats={data.chats.filter((c) => c.projectId === x.id)} />}
      {(tab === "backlog" || tab === "roadmap") && (
        <Panel title={name} wide>
          <Markdown source={x[tab]} />
        </Panel>
      )}
      {tab === "docs" && <DocsTab docs={data.docs.filter((d) => d.projectId === x.id)} />}
    </>
  );
}
