// Builds the front's `Data` (src/data/types.ts) from the database. Rules on top of it stay in the front.
import type { Agent, Data, Doc, Limit, Project, Sprint, Task, Tone } from "../src/data/types.ts";
import type { Db } from "./db.ts";
import { USD_SQL, usageByDay } from "./usage.ts";

// shortcut: fixed spend that equals 100% of the 5 h window; make it a setting when a real limit source exists.
export const H5_USD = 17;
const H5_MS = 5 * 3600e3;

type Row = Record<string, string | number | null>;

const s = (v: unknown) => (v == null ? undefined : String(v));
const n = (v: unknown) => (v == null ? undefined : Number(v));
const parse = <T>(v: unknown): T | undefined =>
  v == null ? undefined : (JSON.parse(String(v)) as T);

const toTask = (r: Row): Task => ({
  id: String(r.id),
  title: String(r.title),
  done: !!r.done,
  startedAt: s(r.started_at),
  endedAt: s(r.ended_at),
  review: s(r.review) as Task["review"],
  agent: s(r.agent_kind) as Task["agent"],
  steps: n(r.steps),
  wave: n(r.wave),
  plan:
    r.plan_start == null
      ? undefined
      : {
          start: Number(r.plan_start),
          duration: Number(r.plan_duration ?? 0),
          deps: parse<string[]>(r.plan_deps) ?? [],
        },
});

function limit(db: Db, window: string, now: number): Limit | undefined {
  const r = db.prepare("SELECT pct, resets_at FROM limit_window WHERE window = ?").get(window) as
    Row | undefined;
  if (!r || Date.parse(String(r.resets_at)) <= now) return undefined;
  return { pct: Number(r.pct), resetsAt: String(r.resets_at) };
}

export function buildData(db: Db, now = Date.now()): Data {
  const all = (sql: string, ...args: (string | number)[]) => db.prepare(sql).all(...args) as Row[];
  const iso = new Date(now).toISOString();

  const events = all(
    "SELECT project_id, at, body FROM event WHERE type = 'project.event' ORDER BY at",
  );
  const projects: Project[] = all("SELECT * FROM project ORDER BY id").map((r) => ({
    id: String(r.id),
    name: String(r.name),
    backlog: s(r.backlog) ?? "",
    roadmap: s(r.roadmap) ?? "",
    lastActivityAt: String(r.last_activity_at),
    phase: parse(r.phase_json),
    nextStep: parse(r.next_step_json),
    whereStopped: s(r.where_stopped),
    alerts: parse(r.alerts_json),
    events: events
      .filter((e) => e.project_id === r.id)
      .map((e) => {
        const b = JSON.parse(String(e.body)) as { kind: Tone; text: string };
        return { at: String(e.at), kind: b.kind, text: b.text };
      }),
    promoted: !!r.promoted,
  }));

  const tasks = all("SELECT * FROM task ORDER BY id");
  const spend = db.prepare(
    `SELECT coalesce(sum(${USD_SQL}), 0) usd FROM usage u WHERE u.project_id = ? AND u.at >= ? AND u.at <= ?`,
  );
  const sprints: Sprint[] = all("SELECT * FROM sprint ORDER BY project_id, id").map((r) => ({
    id: String(r.id),
    projectId: String(r.project_id),
    title: String(r.title),
    goal: s(r.goal),
    status: String(r.status) as Sprint["status"],
    approvedAt: s(r.approved_at),
    startedAt: s(r.started_at),
    deliveredAt: s(r.delivered_at),
    closedAt: s(r.closed_at),
    plannedMin: n(r.planned_min),
    usd: r.started_at
      ? Number(
          (spend.get(String(r.project_id), String(r.started_at), s(r.closed_at) ?? iso) as Row).usd,
        )
      : undefined,
    tasks: tasks.filter((t) => t.project_id === r.project_id && t.sprint_id === r.id).map(toTask),
  }));

  const agents = all("SELECT * FROM agent ORDER BY started_at");
  const chats = all("SELECT * FROM chat ORDER BY started_at DESC").map((r) => ({
    id: String(r.id),
    projectId: String(r.project_id),
    title: String(r.title),
    startedAt: String(r.started_at),
    endedAt: s(r.ended_at),
    sprintId: s(r.sprint_id),
    agents: agents
      .filter((a) => a.chat_id === r.id)
      .map((a) => ({
        id: String(a.id),
        kind: String(a.kind) as Agent["kind"],
        name: String(a.name),
        task: s(a.task_id),
        doing: s(a.doing),
        contextPct: n(a.context_pct),
        startedAt: String(a.started_at),
        endedAt: s(a.ended_at),
      })),
    tasks: tasks.filter((t) => t.chat_id === r.id).map(toTask),
  }));

  const docs: Doc[] = all("SELECT * FROM doc ORDER BY date").map((r) => ({
    id: String(r.id),
    projectId: String(r.project_id),
    kind: String(r.kind) as Doc["kind"],
    title: String(r.title),
    date: s(r.date),
    markdown: s(r.markdown) ?? "",
  }));

  const cmd = all(
    "SELECT at, chat_id FROM event WHERE type = 'command' ORDER BY at DESC LIMIT 1",
  )[0];
  const h5Spend = Number(
    (
      db
        .prepare(`SELECT coalesce(sum(${USD_SQL}), 0) usd FROM usage u WHERE u.at > ?`)
        .get(new Date(now - H5_MS).toISOString()) as Row
    ).usd,
  );

  return {
    lastCommand: cmd
      ? { at: String(cmd.at), chatId: s(cmd.chat_id) ?? "" }
      : { at: iso, chatId: "" },
    limits: {
      h5: limit(db, "5h", now) ?? { pct: Math.round((h5Spend / H5_USD) * 100), estimated: true },
      week: limit(db, "week", now),
      h5Usd: H5_USD,
    },
    projects,
    chats,
    sprints,
    usage: usageByDay(db),
    docs,
  };
}
