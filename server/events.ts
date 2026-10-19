// Event importer: harness JSONL files → SQLite (spec 0001 §2, S03 extensions in the spec's §2.4).
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { importLines, type Db } from "./db.ts";

export const DEFAULT_EVENTS_DIR = join(homedir(), ".main-harness", "events");

type Value = string | number | null;
type Row = Record<string, Value | undefined>;
// Any field may be missing or of the wrong type: SQLite binding rejects objects, and that lands in import_error.
type Event = Record<string, unknown> & { ts: string; project: string; type: string; chat?: string };

const STEPS = ["test", "code", "lint", "review", "commit"];

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

const json = (v: unknown) => (v === undefined ? undefined : JSON.stringify(v));
const str = (v: unknown) => v as string | undefined;
const num = (v: unknown) => v as number | undefined;
const need = (v: unknown, name: string) => {
  if (typeof v !== "string" || !v) throw new Error(`missing ${name}`);
  return v;
};

const TONES = ["ok", "bad", "warn", "run"];

const strings = (v: unknown, name: string) => {
  if (v !== undefined && !(Array.isArray(v) && v.every((x) => typeof x === "string")))
    throw new Error(`bad ${name}`);
  return v as string[] | undefined;
};

/** JSON fields go to the front as-is: throw unless `v` is missing or an object with these string fields (`x?` = optional). */
function check(v: unknown, name: string, fields: string[], tones = TONES) {
  if (v === undefined) return;
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error(`bad ${name}`);
  const o = v as Record<string, unknown>;
  for (const f of fields) {
    const k = f.replace("?", "");
    if (!(f.endsWith("?") && o[k] === undefined) && typeof o[k] !== "string")
      throw new Error(`bad ${name}.${k}`);
  }
  if ("tone" in o && !tones.includes(o.tone as string)) throw new Error(`bad ${name}.tone`);
}

function checkStatus(e: Event) {
  if (e.whereStopped !== undefined && typeof e.whereStopped !== "string")
    throw new Error("bad whereStopped");
  check(e.nextStep, "nextStep", ["title", "detail", "action"]);
  check(e.phase, "phase", ["label", "tone"]);
  if (
    e.phase &&
    (e.phase as { live?: unknown }).live !== undefined &&
    typeof (e.phase as { live?: unknown }).live !== "boolean"
  )
    throw new Error("bad phase.live");
  if (e.alerts !== undefined && !Array.isArray(e.alerts)) throw new Error("bad alerts");
  for (const a of (e.alerts ?? []) as unknown[])
    check(a ?? null, "alert", ["tone", "title", "detail"], ["bad", "warn"]);
}

function parse(line: string): Event {
  const e = JSON.parse(line) as Partial<Event>;
  if (typeof e !== "object" || e === null) throw new Error("not an object");
  if (e.v !== 1) throw new Error("unsupported v");
  if (typeof e.ts !== "string" || Number.isNaN(Date.parse(e.ts))) throw new Error("bad ts");
  if (typeof e.project !== "string" || !e.project) throw new Error("bad project");
  if (typeof e.type !== "string") throw new Error("bad type");
  if (e.chat !== undefined && typeof e.chat !== "string") throw new Error("bad chat");
  return e as Event;
}

/** Is there an already imported event of this type and project newer than `ts`? */
const newer = (db: Db, e: Event) =>
  !!db
    .prepare(
      "SELECT 1 FROM event WHERE project_id = ? AND type = ? AND at > ? AND json_extract(body, '$.window') IS ?",
    )
    .get(e.project, e.type, e.ts, (e.window as string | undefined) ?? null);

function sprintRow(db: Db, e: Event, set: Row, merge?: Record<string, string>) {
  const id = str(e.sprint);
  if (!id) throw new Error("missing sprint");
  upsert(db, "sprint", { project_id: e.project, id }, set, { title: id, status: "planned" }, merge);
}

function taskRow(db: Db, e: Event, set: Row, merge?: Record<string, string>) {
  const id = str(e.task);
  const sprint = str(e.sprint);
  if (!id) throw new Error("missing task");
  if (!sprint && !e.chat) throw new Error("task without sprint or chat");
  const key = { project_id: e.project, scope: sprint ?? `chat:${e.chat}`, id };
  upsert(db, "task", key, set, { title: id, sprint_id: sprint ?? null }, merge);
}

function apply(db: Db, e: Event) {
  const { ts, project, chat } = e;
  switch (e.type) {
    case "project.register":
      return upsert(
        db,
        "project",
        { id: project },
        {
          name: str(e.name),
          repo_path: str(e.repoPath),
          backlog: str(e.backlog),
          roadmap: str(e.roadmap),
        },
        { name: project, last_activity_at: ts }, // NOT NULL is checked before ON CONFLICT
      );
    case "project.status":
      checkStatus(e);
      if (newer(db, e)) return;
      return upsert(
        db,
        "project",
        { id: project },
        {
          where_stopped: str(e.whereStopped) ?? null,
          next_step_json: json(e.nextStep) ?? null,
          phase_json: json(e.phase) ?? null,
          alerts_json: json(e.alerts) ?? null,
        },
        { name: project, last_activity_at: ts },
      );
    case "sprint.plan": {
      const tasks = (e.tasks ?? []) as Record<string, unknown>[];
      if (!Array.isArray(tasks)) throw new Error("tasks is not a list");
      sprintRow(db, e, {
        title: str(e.title),
        goal: str(e.goal),
        planned_at: ts,
        planned_min: num(e.plannedMin),
        usd_estimate: num(e.usdEstimate),
      });
      for (const t of tasks) {
        const plan = (t.plan ?? {}) as Record<string, unknown>;
        taskRow(
          db,
          { ...e, task: t.id },
          {
            title: str(t.title),
            wave: num(t.wave),
            agent_kind: str(t.agent),
            plan_start: num(plan.start),
            plan_duration: num(plan.duration),
            plan_deps: json(strings(plan.deps, "plan.deps")),
          },
        );
      }
      return;
    }
    case "sprint.approve":
      return sprintRow(db, e, { approved_at: ts });
    case "sprint.open":
      return sprintRow(
        db,
        e,
        { started_at: ts, status: "active" },
        { status: "CASE status WHEN 'closed' THEN status ELSE 'active' END" },
      );
    case "sprint.delivered":
      return sprintRow(db, e, { delivered_at: ts });
    case "sprint.feedback":
      return sprintRow(
        db,
        e,
        { feedback_rounds: num(e.round) ?? 1 },
        { feedback_rounds: "max(feedback_rounds, excluded.feedback_rounds)" },
      );
    case "sprint.close":
      return sprintRow(db, e, { closed_at: ts, status: "closed" });
    case "task.start":
      return taskRow(db, e, {
        title: str(e.title),
        agent_kind: str(e.agent),
        chat_id: chat,
        started_at: ts,
      });
    case "task.phase": {
      const steps = STEPS.indexOf(str(e.step) ?? "");
      if (steps < 0) throw new Error("bad step");
      return taskRow(db, e, { steps }, { steps: "max(steps, excluded.steps)" });
    }
    case "task.done":
      return taskRow(db, e, { done: 1, ended_at: ts });
    case "task.review": {
      if (e.result !== "pass" && e.result !== "fail") throw new Error("bad result");
      const round = num(e.round) ?? 1;
      return taskRow(
        db,
        e,
        { review: e.result, review_round: round },
        {
          review:
            "CASE WHEN excluded.review_round >= review_round THEN excluded.review ELSE review END",
          review_round: "max(review_round, excluded.review_round)",
        },
      );
    }
    case "chat.start":
    case "chat.end": {
      if (!chat) throw new Error("missing chat");
      const set =
        e.type === "chat.start"
          ? { title: str(e.title), sprint_id: str(e.sprint), started_at: ts }
          : { ended_at: ts };
      return upsert(db, "chat", { id: chat }, set, {
        project_id: project,
        title: chat,
        started_at: ts,
      });
    }
    case "agent.start":
    case "agent.context":
    case "agent.end": {
      const id = str(e.agent);
      if (!id || !chat) throw new Error("missing agent or chat");
      const set =
        e.type === "agent.start"
          ? {
              kind: str(e.kind),
              name: str(e.name),
              task_id: str(e.task),
              doing: str(e.doing),
              started_at: ts,
            }
          : e.type === "agent.context"
            ? { context_pct: num(e.pct) }
            : { ended_at: ts };
      return upsert(db, "agent", { id }, set, {
        chat_id: chat,
        kind: "clone",
        name: id,
        started_at: ts,
      });
    }
    case "doc.write":
      return upsert(
        db,
        "doc",
        { project_id: project, id: need(e.id, "id") },
        {
          kind: str(e.kind),
          title: str(e.title),
          path: str(e.path),
          markdown: str(e.markdown),
          date: str(e.date) ?? ts,
        },
      );
    case "limit":
      if (typeof e.pct !== "number") throw new Error("bad pct");
      if (newer(db, e)) return;
      return upsert(
        db,
        "limit_window",
        { window: need(e.window, "window") },
        { pct: num(e.pct), resets_at: str(e.resetsAt), at: ts },
      );
    case "usage":
      return upsert(
        db,
        "usage",
        { id: need(e.id, "id") },
        {},
        {
          project_id: project,
          chat_id: chat,
          agent_id: str(e.agent),
          at: ts,
          model: str(e.model) ?? "unknown",
          tokens_in: num(e.tokensIn),
          tokens_out: num(e.tokensOut),
          cache_read: num(e.cacheRead),
          cache_write: num(e.cacheWrite),
        },
      );
    case "project.event":
      return check({ tone: e.kind, text: e.text }, "project.event", ["tone", "text"]);
    // command and unknown types live only in the event log
  }
}

/** Imports one event line; a duplicate (same line already imported) is a no-op. Throws on invalid lines. */
export function importEvent(db: Db, line: string) {
  const e = parse(line);
  const hash = createHash("sha1").update(line).digest("hex");
  db.exec("SAVEPOINT ev");
  try {
    const { changes } = db
      .prepare(
        "INSERT OR IGNORE INTO event (project_id, at, type, chat_id, body, hash) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(e.project, e.ts, e.type, e.chat ?? null, line, hash);
    if (changes) {
      if (e.project !== "*") {
        upsert(
          db,
          "project",
          { id: e.project },
          { last_activity_at: e.ts },
          { name: e.project },
          {
            last_activity_at: "max(last_activity_at, excluded.last_activity_at)",
          },
        );
      }
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
    .reduce((n, f) => n + importLines(db, join(dir, f), (line) => importEvent(db, line)), 0);
}
