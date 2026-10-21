// Event importer: harness JSONL files (contract v1, Main Harness docs/contracts/events.md) → SQLite.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { importLines, type Db } from "./db.ts";

export const DEFAULT_EVENTS_DIR = join(homedir(), ".harness", "events");

type Value = string | number | null;
type Row = Record<string, Value | undefined>;
// Envelope fields are checked in parse(); `data` fields may be missing or of the wrong type.
interface Event {
  id: string;
  ts: string;
  project: string;
  session: string | null;
  sprint: string | null;
  task: string | null;
  agent: string | null;
  type: string;
  data: Record<string, unknown>;
}

/** INSERT … ON CONFLICT(key) DO UPDATE: `set` overwrites (undefined = keep), `defaults` only fill new rows. */
function upsert(
  db: Db,
  table: string,
  key: Row,
  set: Row,
  defaults: Row = {},
  merge: Record<string, string> = {},
) {
  const defined = (r: Row) =>
    Object.entries(r).filter(([, v]) => v !== undefined) as [string, Value][];
  const sets = defined(set);
  const row = new Map([...defined(defaults), ...defined(key), ...sets]);
  const cols = [...row.keys()];
  const upd = sets.map(([c]) => `${c} = ${merge[c] ?? `excluded.${c}`}`);
  db.prepare(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})
     ON CONFLICT(${Object.keys(key).join(", ")}) DO ${upd.length ? `UPDATE SET ${upd.join(", ")}` : "NOTHING"}`,
  ).run(...row.values());
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const optStr = (v: unknown, name: string) => {
  if (v !== null && v !== undefined && typeof v !== "string") throw new Error(`bad ${name}`);
  return v ?? null;
};

/** Parses one line; "skip" for an unknown contract version. Throws on an invalid envelope. */
function parse(line: string): Event | "skip" {
  const e = JSON.parse(line) as Record<string, unknown> | null;
  if (typeof e !== "object" || e === null || Array.isArray(e)) throw new Error("not an object");
  if (e.v !== 1) return "skip";
  if (typeof e.id !== "string" || !e.id) throw new Error("bad id");
  if (typeof e.ts !== "string" || Number.isNaN(Date.parse(e.ts))) throw new Error("bad ts");
  if (typeof e.project !== "string" || !e.project) throw new Error("bad project");
  if (typeof e.type !== "string") throw new Error("bad type");
  if (typeof e.data !== "object" || e.data === null || Array.isArray(e.data))
    throw new Error("bad data");
  return {
    id: e.id,
    ts: e.ts,
    project: e.project,
    session: optStr(e.session, "session"),
    sprint: optStr(e.sprint, "sprint"),
    task: optStr(e.task, "task"),
    agent: optStr(e.agent, "agent"),
    type: e.type,
    data: e.data as Record<string, unknown>,
  };
}

// hx task phase → steps done (src/data/types.ts STEPS: Teste, Código, Lint, Revisão, Commit).
const PHASE_STEPS: Record<string, number> = {
  testes: 0,
  código: 1,
  codigo: 1,
  lint: 2,
  revisão: 3,
  revisao: 3,
  commit: 4,
};
const AGENT_NAMES: Record<string, string> = { "tech-lead": "Tech Lead", reviewer: "Reviewer" };
const agentKind = (a: string) => (a === "tech-lead" || a === "reviewer" ? a : "clone");

function sprintRow(db: Db, e: Event, set: Row, merge?: Record<string, string>) {
  if (!e.sprint) throw new Error("missing sprint");
  upsert(
    db,
    "sprint",
    { project_id: e.project, id: e.sprint },
    set,
    { title: e.sprint, status: "planned" },
    merge,
  );
}

function taskRow(db: Db, e: Event, set: Row, merge?: Record<string, string>) {
  if (!e.task) throw new Error("missing task");
  if (!e.sprint && !e.session) throw new Error("task without sprint or session");
  const key = { project_id: e.project, scope: e.sprint ?? `chat:${e.session}`, id: e.task };
  upsert(db, "task", key, set, { title: e.task, sprint_id: e.sprint ?? undefined }, merge);
}

/** Chat = session; agents = the `agent` values seen in it (first event → start, session.end → end). */
function sessionRows(db: Db, e: Event) {
  if (!e.session) return;
  upsert(
    db,
    "chat",
    { id: e.session },
    { started_at: e.ts, sprint_id: e.sprint ?? undefined },
    { project_id: e.project, title: e.session },
    { started_at: "min(started_at, excluded.started_at)" },
  );
  // alert.context has no agent: the main session's context is the Tech Lead's.
  const agent = e.agent ?? (e.type === "alert.context" ? "tech-lead" : null);
  if (!agent) return;
  upsert(
    db,
    "agent",
    { id: `${e.session}:${agent}` },
    { started_at: e.ts, task_id: e.task ?? undefined },
    { chat_id: e.session, kind: agentKind(agent), name: AGENT_NAMES[agent] ?? agent },
    { started_at: "min(started_at, excluded.started_at)" },
  );
}

function apply(db: Db, e: Event) {
  const { ts, data: d } = e;
  sessionRows(db, e);
  switch (e.type) {
    case "session.end":
      if (!e.session) return;
      db.prepare("UPDATE chat SET ended_at = ? WHERE id = ?").run(ts, e.session);
      db.prepare("UPDATE agent SET ended_at = ? WHERE chat_id = ? AND ended_at IS NULL").run(
        ts,
        e.session,
      );
      return;
    case "sprint.approved":
      return sprintRow(db, e, {
        approved_at: str(d.approved_at) ?? ts,
        plan_path: str(d.plan),
      });
    case "sprint.open":
      return sprintRow(
        db,
        e,
        { started_at: ts, status: "active", task_count: num(d.tasks) },
        { status: "CASE status WHEN 'closed' THEN status ELSE 'active' END" },
      );
    case "sprint.feedback":
      return sprintRow(db, e, { feedback_rounds: 1 }, { feedback_rounds: "feedback_rounds + 1" });
    case "sprint.close":
      return sprintRow(db, e, { closed_at: ts, status: "closed" });
    case "task.start":
      return taskRow(db, e, {
        agent_kind: e.agent ? agentKind(e.agent) : undefined,
        chat_id: e.session ?? undefined,
        started_at: ts,
        done: 0,
        ended_at: null,
        steps: 0,
      });
    case "task.phase": {
      const steps = PHASE_STEPS[str(d.phase) ?? ""];
      return steps === undefined ? undefined : taskRow(db, e, { steps });
    }
    case "task.done":
      return taskRow(db, e, { done: 1, ended_at: ts, steps: 5 });
    case "review.result": {
      if (d.result !== "pass" && d.result !== "fail") throw new Error("bad result");
      // review_round = how many times the Reviewer rejected the task
      return taskRow(
        db,
        e,
        { review: d.result, review_round: d.result === "fail" ? 1 : 0 },
        { review_round: "review_round + excluded.review_round" },
      );
    }
    case "alert.context": {
      const tokens = num(d.tokens);
      const max = num(d.limit);
      if (!e.session || tokens === undefined || !max) return;
      db.prepare("UPDATE agent SET context_pct = ? WHERE id = ?").run(
        Math.round((tokens / max) * 100),
        `${e.session}:${e.agent ?? "tech-lead"}`,
      );
      return;
    }
    case "usage": {
      const id = str(d.message_id);
      if (!id) throw new Error("missing message_id");
      // Same id as the transcript importer (message.id): whichever comes first wins.
      return upsert(
        db,
        "usage",
        { id },
        {},
        {
          project_id: e.project,
          chat_id: e.session ?? undefined,
          agent_id: e.agent ?? undefined,
          at: ts,
          model: str(d.model) ?? "unknown",
          tokens_in: num(d.input),
          tokens_out: num(d.output),
          cache_read: num(d.cache_read),
          cache_write: num(d.cache_write),
        },
      );
    }
    // other types live only in the event log
  }
}

/** Imports one event line; a repeated event id is a no-op. Throws on invalid lines. */
export function importEvent(db: Db, line: string): "skip" | undefined {
  const e = parse(line);
  if (e === "skip") return e;
  db.exec("SAVEPOINT ev");
  try {
    const { changes } = db
      .prepare(
        "INSERT OR IGNORE INTO event (project_id, at, type, chat_id, body, hash) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(e.project, e.ts, e.type, e.session, line, e.id);
    if (changes) {
      upsert(
        db,
        "project",
        { id: e.project },
        { last_activity_at: e.ts },
        { name: e.project },
        { last_activity_at: "max(last_activity_at, excluded.last_activity_at)" },
      );
      apply(db, e);
    }
    db.exec("RELEASE ev");
  } catch (err) {
    db.exec("ROLLBACK TO ev");
    db.exec("RELEASE ev");
    throw err;
  }
}

/** Imports the new lines of every `*.jsonl` in `dir`. Returns how many lines were read. */
export function importEvents(db: Db, dir = DEFAULT_EVENTS_DIR): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .reduce((n, f) => n + importLines(db, join(dir, f), (line) => importEvent(db, line)), 0);
}
