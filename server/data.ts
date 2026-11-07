// Builds the front's `Data` (src/data/types.ts) from the database and the repos' docs (spec 0001 §4.1).
import type {
  Agent,
  Consumption,
  Data,
  Limit,
  ModelUsage,
  Project,
  ProjectEvent,
  Sprint,
  Task,
  Wait,
} from "../src/data/types.ts";
import { basename } from "node:path";
import type { Db } from "./db.ts";
import { listDocs, readDocsFile, readPlan, type Plan } from "./repo.ts";
import { USD_SQL, usageByDay } from "./usage.ts";

// API-priced spend that equals 100% of each window, from the regression in docs/adr/0002-calibracao-limites.md.
// shortcut: fixed constants; refit with more readings when they drift.
export const H5_USD = 30;
export const WEEK_USD = 227;
const H5_MS = 5 * 3600e3;
const WEEK_MS = 7 * 24 * 3600e3;
// shortcut: "live" = project activity in the last 30 min, not an open agent; use agent.end once the harness writes it.
const LIVE_MS = 30 * 60e3;

type Row = Record<string, string | number | null>;

const s = (v: unknown) => (v == null ? undefined : String(v));
const n = (v: unknown) => (v == null ? undefined : Number(v));
const parse = <T>(v: unknown): T | undefined =>
  v == null ? undefined : (JSON.parse(String(v)) as T);

/** Sums of a `usage` selection (alias u): row count, the four token kinds and US$. */
const KINDS_SQL = `count(*) n, sum(coalesce(u.tokens_in, 0)) input, sum(coalesce(u.tokens_out, 0)) output,
  sum(coalesce(u.cache_read, 0)) cacheRead, sum(coalesce(u.cache_write, 0)) cacheWrite, sum(${USD_SQL}) usd`;

/** A KINDS_SQL row as Consumption; no usage row = undefined, not zeros. */
const consumption = (r?: Row): Consumption | undefined =>
  r && Number(r.n)
    ? {
        input: Number(r.input),
        output: Number(r.output),
        cacheRead: Number(r.cacheRead),
        cacheWrite: Number(r.cacheWrite),
        usd: Number(r.usd),
        pct5h: (Number(r.usd) / H5_USD) * 100,
        pctWeek: (Number(r.usd) / WEEK_USD) * 100,
      }
    : undefined;

const toTask = (r: Row, consumed: (r: Row) => Consumption | undefined): Task => ({
  consumption: consumed(r),
  id: String(r.id),
  title: String(r.title),
  done: !!r.done,
  startedAt: s(r.started_at),
  endedAt: s(r.ended_at),
  review: s(r.review) as Task["review"],
  agent: s(r.agent_kind) as Task["agent"],
  steps: n(r.steps),
  wave: n(r.wave),
  agentId: s(r.agent_id),
  model: s(r.model),
  plan:
    r.plan_start == null
      ? undefined
      : {
          start: Number(r.plan_start),
          duration: Number(r.plan_duration ?? 0),
          deps: parse<string[]>(r.plan_deps) ?? [],
        },
});

/**
 * A window's limit: the last reading plus the spend since it (the statusline stops near the limit), a
 * `limit` turn after it = 100% until the reset, past the reset only the spend since resets_at counts.
 */
function limit(db: Db, window: "5h" | "week", now: number): Limit {
  const [usd, ms] = window === "5h" ? [H5_USD, H5_MS] : [WEEK_USD, WEEK_MS];
  const spent = (since: string) =>
    Number(
      (
        db
          .prepare(
            `SELECT coalesce(sum(${USD_SQL}), 0) usd FROM usage u WHERE julianday(u.at) > julianday(?)`,
          )
          .get(since) as Row
      ).usd,
    );
  const pctOf = (base: number, since: string) =>
    Math.min(100, Math.round(base + (100 * spent(since)) / usd));
  const r = db
    .prepare("SELECT pct, resets_at, at FROM limit_window WHERE window = ?")
    .get(window) as Row | undefined;
  if (!r) return { pct: pctOf(0, new Date(now - ms).toISOString()), estimated: true };
  const resetsAt = String(r.resets_at);
  if (Date.parse(resetsAt) <= now) return { pct: pctOf(0, resetsAt), estimated: true };
  const at = String(r.at);
  const blocked = db
    .prepare("SELECT 1 FROM turn WHERE kind = 'limit' AND julianday(at) > julianday(?) LIMIT 1")
    .get(at);
  if (blocked) return { pct: 100, resetsAt, estimated: true };
  const pct = pctOf(Number(r.pct), at);
  return pct === Number(r.pct) ? { pct, resetsAt } : { pct, resetsAt, estimated: true };
}

const AGENT_KINDS = ["tech-lead", "clone", "reviewer"];

/** Waits in turns sorted by chat and time: the gap from a chat's last assistant line to Daniel's next message, clipped to [from, to]. */
function waitsOf(turns: Row[], from: string, to: string): Wait[] {
  const out: Wait[] = [];
  const lo = Date.parse(from);
  const hi = Date.parse(to);
  let prev: Row | undefined;
  for (const t of turns) {
    if (t.kind === "human" && prev && prev.chat_id === t.chat_id && prev.kind !== "human") {
      // shortcut: a limit wait runs until Daniel's next message, not until the limit resets.
      const start = Math.max(lo, Date.parse(String(prev.at)));
      const end = Math.min(hi, Date.parse(String(t.at)));
      if (end > start)
        out.push({
          kind: prev.kind === "limit" ? "limit" : "reply",
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        });
    }
    prev = t;
  }
  return out;
}

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
      plannedModel: p.plannedModel,
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
type WithRounds = Sprint & { rounds: Record<string, number>; planIssue?: string };

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
  if (last?.planIssue)
    alerts.push({
      tone: "warn",
      title: "Plano fora do padrão do harness",
      detail: last.planIssue,
    });
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
  // Task's agent = the last non-reviewer agent of its task.start / task.phase events (same id as the agent rows).
  const taskAgent = new Map<string, string>();
  for (const e of all(
    `SELECT project_id p, coalesce(json_extract(body, '$.sprint'), 'chat:' || chat_id) scope, json_extract(body, '$.task') task,
       chat_id || ':' || json_extract(body, '$.agent') agent
     FROM event WHERE type IN ('task.start', 'task.phase') AND chat_id IS NOT NULL AND json_extract(body, '$.agent') IS NOT NULL
       AND json_extract(body, '$.agent') != 'reviewer' AND json_extract(body, '$.agent') NOT LIKE '%:reviewer'
     ORDER BY at, rowid`,
  ))
    taskAgent.set(`${e.p}/${e.scope}/${e.task}`, String(e.agent));
  for (const t of tasks) t.agent_id = taskAgent.get(`${t.project_id}/${t.scope}/${t.id}`) ?? null;
  const windowUse = db.prepare(
    `SELECT ${KINDS_SQL} FROM usage u WHERE u.project_id = ? AND julianday(u.at) BETWEEN julianday(?) AND julianday(?)`,
  );
  const spend = (project: unknown, from: string, to: string) =>
    windowUse.get(String(project), from, to) as Row;
  // Agent row id = "<chat>:<harness agent>": main-session lines are the Tech Lead's, a subagent's carry its agentType.
  const kindsBy = (idSql: string, where: string) =>
    new Map(
      all(
        `SELECT ${idSql} id, ${KINDS_SQL},
           sum(coalesce(u.tokens_in, 0) + coalesce(u.tokens_out, 0) + coalesce(u.cache_read, 0) + coalesce(u.cache_write, 0)) tokens
         FROM usage u WHERE ${where} GROUP BY 1`,
      ).map((r) => [String(r.id), r]),
    );
  const agentUse = kindsBy(
    "u.chat_id || ':' || coalesce(u.agent_type, u.agent_id, 'tech-lead')",
    "u.chat_id IS NOT NULL",
  );
  const idUse = kindsBy(
    "u.chat_id || ':' || u.agent_id",
    "u.chat_id IS NOT NULL AND u.agent_id IS NOT NULL",
  );
  /** A task's usage: its own subagent's. The Tech Lead's is the whole chat's and parallel tasks share a window, so no split: undefined. */
  const taskUse = (t: Row) =>
    t.agent_id && !String(t.agent_id).endsWith(":tech-lead")
      ? consumption(agentUse.get(String(t.agent_id)) ?? idUse.get(String(t.agent_id)))
      : undefined;
  const modelsOf = db.prepare(
    `SELECT u.model, sum(coalesce(u.tokens_in, 0)) input, sum(coalesce(u.tokens_out, 0)) output,
       sum(coalesce(u.cache_read, 0) + coalesce(u.cache_write, 0)) cache, sum(${USD_SQL}) usd
     FROM usage u WHERE u.project_id = ? AND julianday(u.at) BETWEEN julianday(?) AND julianday(?)
     GROUP BY u.model ORDER BY u.model`,
  );
  const byModel = (r: Row): ModelUsage[] | undefined => {
    if (!r.started_at) return undefined;
    const rows = modelsOf.all(String(r.project_id), String(r.started_at), s(r.closed_at) ?? iso);
    return rows.length
      ? (rows as Row[]).map((m) => {
          const external = /^gemini/i.test(String(m.model));
          return {
            model: String(m.model),
            input: Number(m.input),
            output: Number(m.output),
            cache: Number(m.cache),
            usd: external ? 0 : Number(m.usd),
            ...(external && { external: true as const }),
          };
        })
      : undefined;
  };
  const turnsOf = db.prepare(
    "SELECT t.chat_id, t.at, t.kind FROM turn t JOIN chat c ON c.id = t.chat_id WHERE c.project_id = ? AND c.sprint_id = ? ORDER BY t.chat_id, t.at",
  );
  /** Waits of the sprint's chats inside its window; undefined = no transcript turn to read them from. */
  const sprintWaits = (r: Row): Wait[] | undefined => {
    if (!r.started_at) return undefined;
    const turns = turnsOf.all(String(r.project_id), String(r.id)) as Row[];
    if (!turns.length) return undefined;
    return waitsOf(turns, String(r.started_at), s(r.closed_at) ?? iso).sort((a, b) =>
      a.start.localeCompare(b.start),
    );
  };
  const repoOf = new Map(
    all("SELECT id, repo_path FROM project").map((r) => [String(r.id), s(r.repo_path)]),
  );
  const sprints: WithRounds[] = all("SELECT * FROM sprint ORDER BY project_id, id").map((r) => {
    const repo = repoOf.get(String(r.project_id));
    const plan = repo && r.plan_path ? readPlan(repo, String(r.plan_path)) : undefined;
    const own = tasks
      .filter((t) => t.project_id === r.project_id && t.sprint_id === r.id)
      .map((t) => toTask(t, taskUse));
    const used = r.started_at
      ? spend(r.project_id, String(r.started_at), s(r.closed_at) ?? iso)
      : undefined;
    // the reviewer's task has no planned minutes by design
    const unplanned = plan?.tasks.filter(
      (t) => t.plannedMin === undefined && !/^reviewer/i.test(t.agent ?? ""),
    );
    const planIssue = !plan
      ? undefined
      : !plan.tasks.length
        ? `0 tarefas lidas em ${basename(String(r.plan_path))}`
        : unplanned?.length
          ? `${unplanned.length} tarefas sem minutos planejados`
          : undefined;
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
      usd: used ? Number(used.usd) : undefined,
      consumption: consumption(used),
      byModel: byModel(r),
      waits: sprintWaits(r),
      tasks: list,
      planIssue,
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

  // A session closed without session.end (crash, window closed) would stay "running" forever:
  // once idle for LIVE_MS, it and its agents end at their last activity.
  const lastAt = (sql: string) =>
    new Map(all(sql).map((r) => [String(r.id), String(r.last)] as const));
  const chatLast = lastAt(
    "SELECT chat_id id, max(at) last FROM event WHERE chat_id IS NOT NULL GROUP BY 1",
  );
  const agentLast = lastAt(
    "SELECT chat_id || ':' || iif(json_extract(body, '$.agent') = 'reviewer', 'main-harness:reviewer', json_extract(body, '$.agent')) id, max(at) last FROM event WHERE chat_id IS NOT NULL AND json_extract(body, '$.agent') IS NOT NULL GROUP BY 1",
  );
  const ended = (end: unknown, last: string | undefined) =>
    s(end) ?? (last && now - Date.parse(last) >= LIVE_MS ? last : undefined);

  const agents = all("SELECT * FROM agent ORDER BY started_at");
  // The harness's agent.start/agent.end carry an agent_id: one agent per id (two clones = two rows).
  // Rows of the same type made from other events (no agent.start) are replaced by them.
  const starts = new Map<string, Row>();
  for (const e of all(
    `SELECT chat_id, at, json_extract(body, '$.agent') agent, json_extract(body, '$.data.agent_id') aid, json_extract(body, '$.task') task
     FROM event WHERE type = 'agent.start' AND chat_id IS NOT NULL AND json_extract(body, '$.data.agent_id') IS NOT NULL ORDER BY at, rowid`,
  ))
    if (!starts.has(`${e.chat_id}:${e.aid}`)) starts.set(`${e.chat_id}:${e.aid}`, e);
  const endsAt = lastAt(
    "SELECT chat_id || ':' || json_extract(body, '$.data.agent_id') id, max(at) last FROM event WHERE type = 'agent.end' AND chat_id IS NOT NULL AND json_extract(body, '$.data.agent_id') IS NOT NULL GROUP BY 1",
  );
  const agentRow = (a: Row, chatId: string): Agent => ({
    id: String(a.id),
    kind: String(a.kind) as Agent["kind"],
    name: String(a.name),
    task: s(a.task_id),
    doing: s(a.doing),
    startedAt: String(a.started_at),
    endedAt: ended(a.ended_at, agentLast.get(String(a.id)) ?? chatLast.get(chatId)),
    tokens: n(agentUse.get(String(a.id))?.tokens),
    usd: n(agentUse.get(String(a.id))?.usd),
    consumption: consumption(agentUse.get(String(a.id))),
  });
  const chats = all("SELECT * FROM chat ORDER BY started_at DESC").map((r) => {
    const chatId = String(r.id);
    const mine = [...starts.entries()].filter(([, e]) => e.chat_id === chatId);
    const typeOf = (e: Row) => String(e.agent).replace(/^reviewer$/, "main-harness:reviewer");
    const typeIds = new Set(mine.map(([, e]) => `${chatId}:${typeOf(e)}`));
    const count = { clone: 0, reviewer: 0 };
    const fromEvents = mine.map(([id, e]): Agent => {
      const type = typeOf(e);
      const row = agents.find((a) => a.id === `${chatId}:${type}`);
      const kind: Agent["kind"] =
        type === "tech-lead" ? type : type.split(":").at(-1) === "reviewer" ? "reviewer" : "clone";
      const nth = kind === "tech-lead" ? 0 : ++count[kind];
      return {
        id,
        kind,
        name:
          kind === "tech-lead" ? "Tech Lead" : `${kind === "clone" ? "Clone" : "Reviewer"} ${nth}`,
        task: s(e.task),
        startedAt: String(e.at),
        endedAt: ended(
          endsAt.get(id) ?? row?.ended_at,
          agentLast.get(`${chatId}:${type}`) ?? chatLast.get(chatId),
        ),
        tokens: n(idUse.get(id)?.tokens),
        usd: n(idUse.get(id)?.usd),
        consumption: consumption(idUse.get(id)),
      };
    });
    return {
      id: chatId,
      projectId: String(r.project_id),
      title: String(r.title),
      startedAt: String(r.started_at),
      endedAt: ended(r.ended_at, chatLast.get(chatId)),
      sprintId: s(r.sprint_id),
      agents: [
        ...agents
          .filter((a) => a.chat_id === r.id && !typeIds.has(String(a.id)))
          .map((a) => agentRow(a, chatId)),
        ...fromEvents,
      ].sort((x, y) => x.startedAt.localeCompare(y.startedAt)),
      tasks: tasks.filter((t) => t.chat_id === r.id).map((t) => toTask(t, taskUse)),
    };
  });

  const cmd = all(
    "SELECT at, chat_id FROM event WHERE type = 'session.start' ORDER BY at DESC, rowid DESC LIMIT 1",
  )[0];
  return {
    lastCommand: cmd
      ? { at: String(cmd.at), chatId: s(cmd.chat_id) ?? "" }
      : { at: iso, chatId: "" },
    limits: {
      h5: limit(db, "5h", now),
      week: limit(db, "week", now),
      h5Usd: H5_USD,
    },
    projects,
    chats,
    sprints: sprints.map(({ rounds: _, planIssue: __, ...x }) => x),
    usage: usageByDay(db, undefined, now),
    docs,
  };
}
