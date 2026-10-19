import { useState, type CSSProperties } from "react";
import type { AgentKind, Data, Project, Tone } from "../data/types";
import { formatUsd } from "../lib/format";
import { activeSprint } from "../lib/select";
import { formatDate, formatTime } from "../lib/time";
import { useBoard } from "../lib/useBoard";
import { useNow } from "../lib/useNow";
import css from "./Timeline.module.css";
import { useData } from "../lib/useData";

const H = 3_600_000;
const D = 24 * H;
const RANGES = ["Hoje", "7 dias", "Sprint"] as const;
type Range = (typeof RANGES)[number];
const COLOR: Record<AgentKind, string> = { "tech-lead": "--tl", clone: "--cl", reviewer: "--rv" };
const t = (iso: string) => Date.parse(iso);

function lanesOf(data: Data, p: Project, now: number) {
  const bars = data.chats
    .filter((c) => c.projectId === p.id)
    .sort((a, b) => t(a.startedAt) - t(b.startedAt))
    .flatMap((c) =>
      c.agents.map((a) => ({
        id: a.id,
        kind: a.kind,
        label: c.sprintId ? a.name : `${a.name} · fora da sprint`,
        adhoc: !c.sprintId,
        open: !a.endedAt,
        from: t(a.startedAt),
        to: a.endedAt ? t(a.endedAt) : now,
      })),
    );
  const marks: { tone: Tone; at: number; text: string }[] = [];
  for (const s of data.sprints.filter((s) => s.projectId === p.id)) {
    if (s.deliveredAt) {
      // Delivered: one milestone instead of a label per task, as in the draft.
      marks.push({ tone: "warn", at: t(s.deliveredAt), text: "entregue, esperando teste" });
      continue;
    }
    if (s.status === "planned") {
      const doc = data.docs.find(
        (d) => d.projectId === p.id && d.kind === "sprint-plan" && d.title.startsWith(`${s.id} `),
      );
      if (doc?.date) marks.push({ tone: "warn", at: t(doc.date), text: "plano pronto" });
    }
    for (const k of s.tasks) {
      if (!k.endedAt) continue;
      if (k.done) marks.push({ tone: "ok", at: t(k.endedAt), text: `${k.id} ✓` });
      else if (k.review === "fail")
        marks.push({ tone: "bad", at: t(k.endedAt), text: `${k.id} reprovada` });
    }
  }
  return { bars, marks };
}

function period(range: Range, now: number, firsts: number[], sprintStarts: number[]) {
  const hourTicks = (start: number, end: number) => {
    const step = Math.ceil((end - start) / H / 8) * H;
    const ticks = [];
    for (let x = Math.ceil(start / H) * H; x <= end; x += step)
      ticks.push({ at: x, label: formatTime(new Date(x).toISOString()) });
    return ticks;
  };
  if (range === "7 dias") {
    const start = now - 7 * D;
    const ticks = [7, 6, 5, 4, 3, 2, 1].map((k) => ({
      at: now - k * D,
      label: formatDate(new Date(now - k * D).toISOString()),
    }));
    return { start, end: now, ticks };
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

export function Timeline() {
  const { data } = useData();
  const { active } = useBoard();
  const now = useNow();
  const [range, setRange] = useState<Range>("Hoje");
  const [shut, setShut] = useState<Set<string>>(new Set());
  const today = new Date(now).toISOString().slice(0, 10);

  const lanes = active.map((p) => ({ p, ...lanesOf(data, p, now) }));
  const { start, end, ticks } = period(
    range,
    now,
    lanes.flatMap((l) => [...l.bars.map((b) => b.from), ...l.marks.map((m) => m.at)]),
    active.flatMap((p) => {
      const s = activeSprint(data, p.id)?.startedAt;
      return s ? [t(s)] : [];
    }),
  );
  const pct = (x: number) => ((x - start) / (end - start)) * 100;
  const toggle = (id: string) =>
    setShut((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  return (
    <>
      <div className={css.tlbar}>
        <div className={css.legend}>
          <span style={{ "--c": "var(--tl)" } as CSSProperties}>Tech Lead</span>
          <span style={{ "--c": "var(--cl)" } as CSSProperties}>Clones</span>
          <span style={{ "--c": "var(--rv)" } as CSSProperties}>Reviewer</span>
          <span>listrado = rodando agora</span>
          <span className={css["adhoc-key"]}>contorno = fora da sprint</span>
        </div>
        <div className={css.range} role="group" aria-label="Período">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={r === range} onClick={() => setRange(r)}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className={css.scroll}>
        <div className={css.tl}>
          <div />
          <div className={css.axis} data-testid="axis">
            {ticks.map((k) => (
              <span key={k.at} style={{ left: `${pct(k.at)}%` }}>
                {k.label}
              </span>
            ))}
          </div>
          {lanes.map(({ p, bars, marks }) => {
            const closed = shut.has(p.id);
            const sprint =
              activeSprint(data, p.id) ??
              data.sprints.find((s) => s.projectId === p.id && s.status === "planned");
            const usd = data.usage
              .filter((u) => u.projectId === p.id && u.date === today)
              .reduce((s, u) => s + u.usd, 0);
            const shown = closed ? [] : bars.filter((b) => b.to > start && b.from < end);
            return [
              <div key={`${p.id}-h`} className={css["lane-h"]} data-project={p.id}>
                <h2>
                  <button
                    type="button"
                    className={css.ctog}
                    aria-expanded={!closed}
                    onClick={() => toggle(p.id)}
                  >
                    {p.name}
                  </button>
                </h2>
                {p.phase && (
                  <span
                    className={`pill p-${p.phase.tone}${p.phase.live ? " live" : ""}`}
                    style={{ justifySelf: "start" }}
                  >
                    {p.phase.label}
                  </span>
                )}
                <span className={css.meta}>
                  {sprint && (
                    <>
                      {sprint.id} ·{" "}
                      <span className="num">
                        {sprint.tasks.filter((k) => k.done).length}/{sprint.tasks.length}
                      </span>{" "}
                      tarefas ·{" "}
                    </>
                  )}
                  {formatUsd(usd)} hoje
                </span>
              </div>,
              <div
                key={`${p.id}-l`}
                className={css.lane}
                style={{ height: closed ? 34 : Math.max(44 + shown.length * 26, 100) }}
              >
                {shown.map((b, i) => {
                  const left = pct(Math.max(b.from, start));
                  return (
                    <div key={b.id} className={css.track} style={{ top: 34 + i * 26 }}>
                      <span className={css.who} style={{ left: `${left}%` }}>
                        {b.label}
                      </span>
                      <div
                        data-agent={b.id}
                        className={[css["seg-b"], b.open && css.open, b.adhoc && css.adhoc]
                          .filter(Boolean)
                          .join(" ")}
                        style={
                          {
                            "--c": `var(${COLOR[b.kind]})`,
                            left: `${left}%`,
                            width: `${pct(Math.min(b.to, end)) - left}%`,
                          } as CSSProperties
                        }
                      />
                    </div>
                  );
                })}
                {marks
                  .filter((m) => m.at >= start && m.at <= end)
                  .map((m) => (
                    <span
                      key={m.text + m.at}
                      className={css.mk}
                      style={{ "--c": `var(--${m.tone})`, left: `${pct(m.at)}%` } as CSSProperties}
                    >
                      {m.text}
                    </span>
                  ))}
                {now >= start && now <= end && (
                  <div data-testid="now" className={css.nowline} style={{ left: `${pct(now)}%` }} />
                )}
              </div>,
            ];
          })}
        </div>
      </div>
    </>
  );
}
