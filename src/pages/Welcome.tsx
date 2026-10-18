import { Link, useNavigate } from "react-router";
import { data } from "../data/mock";
import type { Doc, Project, Tone } from "../data/types";
import { formatTokens, formatUsd } from "../lib/format";
import { sinceLastCommand } from "../lib/since";
import { formatDate, formatTime, formatWeekday } from "../lib/time";
import { useBoard } from "../lib/useBoard";
import s from "./Welcome.module.css";

const DAY = 86_400_000;
// shortcut: rounds elapsed days instead of comparing calendar days, fine while data is the mock (virtual 14:50 clock)
const daysSince = (iso: string) => Math.round((Date.now() - Date.parse(iso)) / DAY);
const ago = (iso: string) => {
  const d = daysSince(iso);
  return d === 0 ? "hoje" : d === 1 ? "ontem" : formatDate(iso);
};

const ICON: Record<Tone, string> = { ok: "✓", warn: "!", bad: "✕", run: "▸" };
const DOC_KINDS: [Doc["kind"], string][] = [
  ["sprint-plan", "plano"],
  ["release-report", "report"],
  ["adr", "ADR"],
  ["prd", "PRD"],
  ["handoff", "handoff"],
];

const backlogTop = (md: string) =>
  md
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .slice(0, 3)
    .map((l) =>
      l
        .slice(2)
        .replace(/^\*\*\[.*?\]\*\*\s*/, "")
        .replace(/\.$/, ""),
    );

function Column({ p }: { p: Project }) {
  const navigate = useNavigate();
  const since = sinceLastCommand(data, p.id);
  const latest = (kind: Doc["kind"]) =>
    data.docs
      .filter((d) => d.projectId === p.id && d.kind === kind)
      .sort((a, b) => Date.parse(b.date ?? "") - Date.parse(a.date ?? ""))[0];
  return (
    <section className="col" aria-label={p.name}>
      <header>
        <h2>
          <Link to={`/p/${p.id}`}>{p.name}</Link>
        </h2>
        {p.phase && (
          <span className={`pill p-${p.phase.tone}${p.phase.live ? " live" : ""}`}>
            {p.phase.label}
          </span>
        )}
      </header>
      {p.nextStep && (
        <div className={s.next}>
          <span className="lbl">Próximo passo</span>
          <strong>{p.nextStep.title}</strong>
          <span className="muted" style={{ fontSize: 13 }}>
            {p.nextStep.detail}
          </span>
          <button type="button" onClick={() => navigate("/controle")}>
            {p.nextStep.action}
          </button>
        </div>
      )}
      <div>
        <h3>Onde parou</h3>
        <p className={s.where}>{p.whereStopped}</p>
      </div>
      <div>
        <h3>Desde o seu último comando</h3>
        <ul className={s.since}>
          {since.events.map((e) => (
            <li key={e.at + e.text}>
              <span className={s.k} style={{ color: `var(--${e.kind})` }}>
                {ICON[e.kind]}
              </span>
              <span>{e.text}</span>
            </li>
          ))}
          <li>
            <span className={s.k} style={{ color: "var(--muted)" }}>
              $
            </span>
            <span>
              {formatUsd(since.usd)} gastos · {formatTokens(since.tokens)} tokens
            </span>
          </li>
        </ul>
      </div>
      <div>
        <h3>Documentos</h3>
        <ul className={s.docs}>
          {DOC_KINDS.map(([kind, label]) => {
            const d = latest(kind);
            if (!d && kind !== "handoff") return null;
            return (
              <li key={kind}>
                <span>
                  <span className={s.t}>{label}</span>{" "}
                  {d ? (
                    <Link to={`/p/${p.id}/docs/${d.id}`}>{d.title.replace(" — ", " · ")}</Link>
                  ) : (
                    <span className="muted">nenhum nesta sprint</span>
                  )}
                </span>
                <span className="muted mono num" style={{ fontSize: 11 }}>
                  {d?.date && ago(d.date)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h3>Topo do backlog</h3>
        <ol className={s.backlog}>
          {backlogTop(p.backlog).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Welcome() {
  const { active } = useBoard();
  const { at, chatId } = data.lastCommand;
  const chat = data.chats.find((c) => c.id === chatId);
  const project = data.projects.find((p) => p.id === chat?.projectId);
  const waiting = active.filter((p) => p.alerts?.length).length;
  return (
    <>
      <div className={s.hello}>
        <h1>Bem-vindo de volta, Daniel.</h1>
        <p>
          Seu último comando foi {formatWeekday(at)}, {formatTime(at)} (
          {daysSince(at) === 0
            ? "hoje"
            : `há ${daysSince(at)} ${daysSince(at) === 1 ? "dia" : "dias"}`}
          ), no chat {chat?.title} ({project?.name}). {waiting} de {active.length} projetos esperam
          algo de você.
        </p>
      </div>
      <div className="cols">
        {active.map((p) => (
          <Column key={p.id} p={p} />
        ))}
      </div>
    </>
  );
}
