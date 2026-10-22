import { useState } from "react";
import { useSearchParams } from "react-router";
import { sprintState } from "../components/Layout";
import { mainSprint, Pill, Tabs } from "../components/ui";
import s from "../components/ui.module.css";
import type { Data, Sprint, Tone } from "../data/types";
import { formatUsd } from "../lib/format";
import { formatDate, formatDuration, formatTime } from "../lib/time";
import { useBoard } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";
import p from "./Timeline.module.css";

const H = 3_600_000;
const D = 24 * H;
const RANGES = ["Hoje", "7 dias", "Sprint"] as const;
type Range = (typeof RANGES)[number];
const t = (iso: string) => Date.parse(iso);

/** Window, then ticks. */
function period(range: Range, now: number, firsts: number[], sprintStarts: number[]) {
  const hourTicks = (start: number, end: number) => {
    const step = Math.ceil((end - start) / H / 8) * H;
    const ticks = [];
    for (let x = Math.ceil(start / H) * H; x <= end; x += step)
      ticks.push({ at: x, label: formatTime(new Date(x).toISOString()) });
    return ticks;
  };
  if (range === "7 dias") {
    const ticks = [7, 6, 5, 4, 3, 2, 1].map((k) => ({
      at: now - k * D,
      label: formatDate(new Date(now - k * D).toISOString()),
    }));
    return { start: now - 7 * D, end: now, ticks };
  }
  if (range === "Sprint") {
    const start = Math.min(now - H, ...sprintStarts);
    return { start, end: now, ticks: hourTicks(start, now) };
  }
  // shortcut: "today" = activity in the last 24 h (mock times are relative to now); use the calendar day with real events.
  const start = Math.floor(Math.min(now, ...firsts.filter((x) => x >= now - D)) / H) * H;
  const end = Math.floor(now / H) * H + H;
  return { start, end, ticks: hourTicks(start, end) };
}

interface Group {
  key: string;
  title: string;
  sprint?: Sprint;
  first: number;
  bars: { id: string; kind: string; name: string; open: boolean; from: number; to: number }[];
  marks: { tone: Tone; at: number; text: string }[];
}

/** Agent rows grouped by sprint, or by loose chat (no sprint). */
function groupsOf(data: Data, projectId: string, now: number): Group[] {
  const groups = new Map<string, Group>();
  for (const c of data.chats.filter((x) => x.projectId === projectId)) {
    const key = c.sprintId ?? `chat:${c.id}`;
    const sprint = data.sprints.find((x) => x.projectId === projectId && x.id === c.sprintId);
    const g = groups.get(key) ?? {
      key,
      title: sprint ? `${sprint.id} ${sprint.title}` : c.title,
      sprint,
      first: t(c.startedAt),
      bars: [],
      marks: [],
    };
    g.first = Math.min(g.first, t(c.startedAt));
    for (const a of c.agents)
      g.bars.push({
        id: a.id,
        kind: a.kind,
        name: a.name,
        open: !a.endedAt,
        from: t(a.startedAt),
        to: a.endedAt ? t(a.endedAt) : now,
      });
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    const x = g.sprint;
    if (!x) continue;
    if (x.deliveredAt) g.marks.push({ tone: "warn", at: t(x.deliveredAt), text: "entregue" });
    for (const k of x.tasks) {
      if (!k.endedAt) continue;
      if (k.done) g.marks.push({ tone: "ok", at: t(k.endedAt), text: `${k.id} ✓` });
      else if (k.review === "fail")
        g.marks.push({ tone: "bad", at: t(k.endedAt), text: `${k.id} reprovada` });
    }
  }
  return [...groups.values()].sort((a, b) => a.first - b.first);
}

export function Timeline() {
  const { data } = useData();
  const { active } = useBoard();
  const now = useNow();
  const [query, setQuery] = useSearchParams();
  const range = RANGES.find((r) => r === query.get("periodo")) ?? "Hoje";
  const setRange = (r: Range) => setQuery({ periodo: r }, { replace: true });
  const [shut, setShut] = useState<Set<string>>(new Set());
  const today = new Date(now).toISOString().slice(0, 10);
  const all = active.map((x) => ({ x, groups: groupsOf(data, x.id, now) }));
  const { start, end, ticks } = period(
    range,
    now,
    all.flatMap(({ groups }) => groups.flatMap((g) => g.bars.map((b) => b.from))),
    active.flatMap((x) => {
      const st = data.sprints.find((y) => y.projectId === x.id && y.status === "active")?.startedAt;
      return st ? [t(st)] : [];
    }),
  );
  const pct = (x: number) => ((x - start) / (end - start)) * 100;
  const toggle = (id: string) =>
    setShut((old) => {
      const n = new Set(old);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  return (
    <>
      <div className={s.pageHead}>
        <h1>Linha do tempo</h1>
        <p className={s.muted}>
          Quem trabalhou em cada projeto, e quando, agrupado por sprint ou chat avulso.
        </p>
      </div>
      <div className={p.tlBar}>
        <Tabs label="Período" items={RANGES.map((r) => [r, r])} value={range} onChange={setRange} />
        <div className={p.legend}>
          <span data-kind="tech-lead">Tech Lead</span>
          <span data-kind="clone">Clones</span>
          <span data-kind="reviewer">Reviewer</span>
          <span data-key="open">listrado: rodando agora</span>
          <span data-key="adhoc">tracejado: fora da sprint</span>
        </div>
      </div>
      <div className={p.tl}>
        <div className={p.tlInner}>
          <div className={p.row}>
            <span />
            <div className={p.axis} data-testid="axis">
              {ticks.map((k) => (
                <span key={k.at} style={{ left: `${pct(k.at)}%` }}>
                  {k.label}
                </span>
              ))}
            </div>
          </div>
          {all.map(({ x, groups }) => {
            const closed = shut.has(x.id);
            const sprint = mainSprint(data, x.id);
            const usd = data.usage
              .filter((u) => u.projectId === x.id && u.date === today)
              .reduce((sum, u) => sum + u.usd, 0);
            const shown = groups
              .map((g) => ({
                ...g,
                bars: g.bars.filter((b) => b.to > start && b.from < end),
                marks: g.marks.filter((m) => m.at >= start && m.at <= end),
              }))
              .filter((g) => g.bars.length);
            return (
              <section key={x.id} aria-label={x.name}>
                <div className={p.projHead}>
                  <button
                    type="button"
                    className={p.ctog}
                    aria-expanded={!closed}
                    aria-label={`Agentes de ${x.name}`}
                    onClick={() => toggle(x.id)}
                  />
                  <h2>{x.name}</h2>
                  {x.phase && (
                    <Pill tone={x.phase.tone} live={x.phase.live}>
                      {x.phase.label}
                    </Pill>
                  )}
                  <span className={s.muted}>
                    {sprint &&
                      `${sprint.id} · ${sprint.tasks.filter((k) => k.done).length}/${sprint.tasks.length} tarefas · `}
                    {formatUsd(usd)} hoje
                  </span>
                </div>
                {!closed && !shown.length && (
                  <p className={`${p.none} ${s.muted}`}>Nenhum agente nesse período.</p>
                )}
                {!closed &&
                  shown.map((g) => {
                    const st = g.sprint && sprintState(g.sprint);
                    return (
                      <div key={g.key} role="group" aria-label={g.title} className={p.row}>
                        <div className={p.gHead}>
                          <b title={g.title}>{g.title}</b>
                          {st ? (
                            <Pill tone={st[1]} live={st[2]}>
                              {st[0]}
                            </Pill>
                          ) : (
                            <small className={s.muted}>fora da sprint</small>
                          )}
                        </div>
                        <div className={p.lane} style={{ height: 44 + g.bars.length * 26 }}>
                          {g.marks.map((m) => (
                            <span
                              key={m.text + m.at}
                              className={p.mk}
                              data-tone={m.tone}
                              style={{ left: `${pct(m.at)}%` }}
                            >
                              {m.text}
                            </span>
                          ))}
                          {g.bars.map((b, i) => {
                            const left = pct(Math.max(b.from, start));
                            return (
                              <div key={b.id} className={p.track} style={{ top: 34 + i * 26 }}>
                                <span className={p.who} style={{ left: `${left}%` }}>
                                  {b.name}
                                </span>
                                <i
                                  data-kind={b.kind}
                                  data-adhoc={!g.sprint || undefined}
                                  data-open={b.open || undefined}
                                  title={`${b.name}: ${formatTime(new Date(b.from).toISOString())}, ${formatDuration(b.to - b.from)}`}
                                  style={{
                                    left: `${left}%`,
                                    width: `${Math.max(0.5, pct(Math.min(b.to, end)) - left)}%`,
                                  }}
                                />
                              </div>
                            );
                          })}
                          {now >= start && now <= end && (
                            <div className={p.now} style={{ left: `${pct(now)}%` }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
