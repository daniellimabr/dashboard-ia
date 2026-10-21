// Builds the front's `Data` (src/data/types.ts) from the database and the repos' docs (spec 0001 §4.1).
import type { Agent, Data, Limit, Project, ProjectEvent, Sprint, Task } from "../src/data/types.ts";
import type { Db } from "./db.ts";
import { listDocs, readDocsFile, readPlan, type Plan } from "./repo.ts";
import { USD_SQL, usageByDay } from "./usage.ts";

// shortcut: fixed spend that equals 100% of the 5 h window; make it a setting when a real limit source exists.
export const H5_USD = 17;
const H5_MS = 5 * 3600e3;
// shortcut: "live" = project activity in the last 30 min, not an open agent; use agent.end once the harness writes it.
const LIVE_MS = 30 * 60e3;

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

const AGENT_KINDS = ["tech-lead", "clone", "reviewer"];

/** Plan tasks in plan order with their state from the events; tasks only in the events go last. Schedule: start = end of the latest dependency. */
function mergePlan(own: Task[], plan: Plan | undefined): Task[] {
  if (!plan?.tasks.length) return own;
  const byId = new Map(own.map((t) => [t.id, t]));
  const ends = new Map<string, number>();
  const merged = plan.tasks.map((p): Task => {
    const start = Math.max(0, ...p.deps.map((d) => ends.get(d) ?? 0));
    if (p.plannedMin !== undefined) ends.set(p.id, start + p.plannedMin);
    const kind = p.agent?.split(/\s/)[0];
    const t = byId.get(p.id);
    return {
      ...(t ?? { id: p.id, done: false }),
      title: p.title,
      agent: t?.agent ?? (AGENT_KINDS.includes(kind ?? "") ? (kind as Task["agent"]) : undefined),
      wave: p.wave,
      plan:
        p.plannedMin === undefined ? undefined : { start, duration: p.plannedMin, deps: p.deps },
    };
  });
  return [...merged, ...own.filter((t) => !plan.tasks.some((p) => p.id === t.id))];
}

/** "T01 concluída", "T02 reprovada (1/2)"…: the project's sprint, task and review events as text. */
function eventTexts(rows: Row[]): ProjectEvent[] {
  const fails = new Map<string, number>();
  return rows.flatMap((r): ProjectEvent[] => {
    const e = JSON.parse(String(r.body)) as {
      sprint: string | null;
      task: string | null;
      data: Record<string, unknown>;
    };
    const at = String(r.at);
    const sp = e.sprint ?? "";
    const t = e.task ?? "";
    const one = (kind: ProjectEvent["kind"], text: string) => [{ at, kind, text }];
    switch (r.type) {
      case "sprint.approved":
        return one("ok", `${sp} aprovada`);
      case "sprint.open":
        return one("run", `${sp} aberta`);
      case "sprint.close":
        return one("ok", `${sp} fechada`);
      case "sprint.feedback": {
        const n = Number(e.data.adjustments) || 0;
        return one("warn", `${sp}: ${n} ${n === 1 ? "ajuste pedido" : "ajustes pedidos"}`);
      }
      case "task.start":
        return one("run", `${t} iniciada`);
      case "task.done":
        return one("ok", `${t} concluída`);
      case "review.result": {
        if (e.data.result !== "fail") return one("ok", `${t} aprovada`);
        const key = `${sp}/${t}`;
        fails.set(key, (fails.get(key) ?? 0) + 1);
        return one("bad", `${t} reprovada (${fails.get(key)}/2)`);
      }
    }
    return [];
  });
}

/** phase, alerts and nextStep of a project from its latest sprint and the plans not yet approved (spec 0001 §4.1). */
type WithRounds = Sprint & { rounds: Record<string, number> };

function status(
  sprints: WithRounds[],
  planDocs: string[],
  live: boolean,
): Pick<Project, "phase" | "alerts" | "nextStep"> {
  const last = sprints.at(-1);
  const known = new Set(sprints.map((x) => x.id));
  const waiting = planDocs
    .map((id) => /\/(S\d+)-plan\.md$/.exec(id)?.[1])
    .filter((id): id is string => !!id && !known.has(id) && (!last || id > last.id))
    .sort()
    .at(-1);
  const alerts: NonNullable<Project["alerts"]> = [];
  let phase: Project["phase"];
  let nextStep: Project["nextStep"];
  if (last?.status === "active") {
    const rejected = last.tasks.filter((t) => t.review === "fail" && !t.done);
    for (const t of rejected) {
      const round = last.rounds[t.id] ?? 1;
      alerts.push({
        tone: "bad",
        title: `Reviewer reprovou ${t.id}`,
        detail: `${round}ª reprovação`,
      });
    }
    if (last.deliveredAt) {
      phase = { label: "Esperando você", tone: "warn" };
      alerts.unshift({
        tone: "warn",
        title: `Testar a entrega da ${last.id}`,
        detail: "Todas as tarefas estão prontas.",
      });
      nextStep = {
        title: `Testar a entrega da ${last.id}`,
        detail: "Teste e diga se precisa de ajuste.",
        action: "Testar",
      };
    } else {
      phase = { label: "Execução", tone: "run", live };
      const done = last.tasks.filter((t) => t.done).length;
      nextStep = rejected[0]
        ? {
            title: `Corrigir a ${rejected[0].id}`,
            detail: "O Reviewer reprovou; a correção volta para ele.",
            action: "Ver sprint",
          }
        : {
            title: `Acompanhar a ${last.id}`,
            detail: `${done} de ${last.tasks.length} tarefas prontas.`,
            action: "Ver sprint",
          };
    }
  }
  if (waiting) {
    alerts.push({
      tone: "warn",
      title: `Plano da ${waiting} esperando aprovação`,
      detail: "Aprove para abrir a sprint.",
    });
    if (!phase) {
      phase = { label: "Plano", tone: "warn" };
      nextStep = {
        title: `Aprovar o plano da ${waiting}`,
        detail: "Leia o plano e aprove.",
        action: "Ver plano",
      };
    }
  }
  return { phase, alerts: alerts.length ? alerts : undefined, nextStep };
}

export function buildData(db: Db, now = Date.now()): Data {
  const all = (sql: string, ...args: (string | number)[]) => db.prepare(sql).all(...args) as Row[];
  const iso = new Date(now).toISOString();

  const tasks = all("SELECT * FROM task ORDER BY id");
  const spend = db.prepare(
    `SELECT coalesce(sum(${USD_SQL}), 0) usd FROM usage u WHERE u.project_id = ? AND u.at >= ? AND u.at <= ?`,
  );
  const repoOf = new Map(
    all("SELECT id, repo_path FROM project").map((r) => [String(r.id), s(r.repo_path)]),
  );
  const sprints: WithRounds[] = all("SELECT * FROM sprint ORDER BY project_id, id").map((r) => {
    const repo = repoOf.get(String(r.project_id));
    const plan = repo && r.plan_path ? readPlan(repo, String(r.plan_path)) : undefined;
    const own = tasks
      .filter((t) => t.project_id === r.project_id && t.sprint_id === r.id)
      .map(toTask);
    const list = mergePlan(own, plan);
    const doneTasks = own.filter((t) => t.done);
    const delivered =
      r.status === "active" && Number(r.task_count) > 0 && doneTasks.length >= Number(r.task_count);
    return {
      id: String(r.id),
      projectId: String(r.project_id),
      title: plan?.title || String(r.title),
      goal: plan?.goal ?? s(r.goal),
      status: String(r.status) as Sprint["status"],
      approvedAt: s(r.approved_at),
      startedAt: s(r.started_at),
      deliveredAt: delivered
        ? doneTasks
            .map((t) => t.endedAt ?? "")
            .sort()
            .at(-1)
        : s(r.delivered_at),
      closedAt: s(r.closed_at),
      plannedMin:
        Math.max(0, ...list.map((t) => (t.plan ? t.plan.start + t.plan.duration : 0))) ||
        n(r.planned_min),
      usd: r.started_at
        ? Number(
            (spend.get(String(r.project_id), String(r.started_at), s(r.closed_at) ?? iso) as Row)
              .usd,
          )
        : undefined,
      tasks: list,
      rounds: Object.fromEntries(
        tasks
          .filter((t) => t.project_id === r.project_id && t.sprint_id === r.id)
          .map((t) => [String(t.id), Number(t.review_round)]),
      ),
    };
  });

  const docs = [...repoOf].flatMap(([id, repo]) => (repo ? listDocs(repo, id) : []));
  const log = all(
    "SELECT project_id, at, type, body FROM event WHERE type IN ('sprint.approved', 'sprint.open', 'sprint.close', 'sprint.feedback', 'task.start', 'task.done', 'review.result') ORDER BY at, rowid",
  );
  const projects: Project[] = all("SELECT * FROM project ORDER BY id").map((r) => {
    const id = String(r.id);
    const repo = s(r.repo_path);
    const events = eventTexts(log.filter((e) => e.project_id === id));
    const live = now - Date.parse(String(r.last_activity_at)) < LIVE_MS;
    return {
      id,
      name: String(r.name),
      backlog: (repo && readDocsFile(repo, "docs/backlog.md")) ?? "",
      roadmap: (repo && readDocsFile(repo, "docs/roadmap.md")) ?? "",
      lastActivityAt: String(r.last_activity_at),
      ...status(
        sprints.filter((x) => x.projectId === id),
        docs.filter((d) => d.projectId === id && d.kind === "sprint-plan").map((d) => d.id),
        live,
      ),
      whereStopped: events.at(-1)?.text,
      events,
      promoted: !!r.promoted,
    };
  });

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

  const cmd = all(
    "SELECT at, chat_id FROM event WHERE type = 'session.start' ORDER BY at DESC, rowid DESC LIMIT 1",
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
    sprints: sprints.map(({ rounds: _, ...x }) => x),
    usage: usageByDay(db),
    docs,
  };
}
