// Turns the mock into sample event files (one JSONL per project). Run: npm run sample-events
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { data as mock } from "../src/data/mock.ts";
import type { Data, Doc, Task } from "../src/data/types.ts";

export interface SampleEvent {
  v: 1;
  ts: string;
  project: string;
  type: string;
  chat?: string;
  [field: string]: unknown;
}

const STEP_NAMES = ["test", "code", "lint", "review", "commit"] as const;
const DOC_DIR: Record<Doc["kind"], string> = {
  "sprint-plan": "sprints",
  "release-report": "sprints",
  adr: "adr",
  prd: "prd",
  handoff: "handoffs",
};
const plus = (ts: string, min: number) => new Date(Date.parse(ts) + min * 60_000).toISOString();

export function toEvents(data: Data, repoPath: string): Record<string, SampleEvent[]> {
  const now = new Date().toISOString();
  const out: Record<string, SampleEvent[]> = {};
  const add = (project: string, ts: string, type: string, fields: object = {}) =>
    (out[project] ??= []).push({ v: 1, ts, project, type, ...fields });

  const taskEvents = (project: string, t: Task, ctx: { chat?: string; sprint?: string }) => {
    if (t.startedAt)
      add(project, t.startedAt, "task.start", {
        ...ctx,
        task: t.id,
        title: t.title,
        agent: t.agent,
      });
    if (!t.done && t.startedAt && t.steps !== undefined && STEP_NAMES[t.steps])
      add(project, plus(t.startedAt, 1), "task.phase", {
        ...ctx,
        task: t.id,
        step: STEP_NAMES[t.steps],
      });
    const end = t.endedAt ?? t.startedAt;
    if (t.done && end) add(project, end, "task.done", { ...ctx, task: t.id });
    if (t.review && end)
      add(project, end, "task.review", { ...ctx, task: t.id, result: t.review, round: 1 });
  };

  for (const p of data.projects) {
    add(p.id, new Date(Date.now() - 30 * 86_400_000).toISOString(), "project.register", {
      name: p.name,
      repoPath: p.id === "dashboard-ia" ? repoPath : `C:/Projetos/${p.name}`,
      backlog: p.backlog,
      roadmap: p.roadmap,
    });
    if (p.whereStopped)
      add(p.id, p.lastActivityAt, "project.status", {
        whereStopped: p.whereStopped,
        nextStep: p.nextStep,
        phase: p.phase,
        alerts: p.alerts,
      });
    for (const e of p.events ?? [])
      add(p.id, e.at, "project.event", { kind: e.kind, text: e.text });
  }

  for (const s of data.sprints) {
    const chat = data.chats.find((c) => c.projectId === s.projectId && c.sprintId === s.id)?.id;
    const ctx = { chat, sprint: s.id };
    const planDoc = data.docs.find((d) => d.projectId === s.projectId && d.id === `${s.id}-plan`);
    const first = s.approvedAt ?? s.startedAt;
    add(s.projectId, planDoc?.date ?? (first ? plus(first, -5) : now), "sprint.plan", {
      ...ctx,
      title: s.title,
      goal: s.goal,
      plannedMin: s.plannedMin,
      usdEstimate: s.usd,
      docPath: `docs/sprints/${s.id}-plan.md`,
      tasks: s.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        wave: t.wave,
        agent: t.agent,
        plan: t.plan,
      })),
    });
    if (s.approvedAt) add(s.projectId, s.approvedAt, "sprint.approve", ctx);
    if (s.startedAt) add(s.projectId, s.startedAt, "sprint.open", ctx);
    if (s.deliveredAt) add(s.projectId, s.deliveredAt, "sprint.delivered", ctx);
    if (s.closedAt) add(s.projectId, s.closedAt, "sprint.close", ctx);
    for (const t of s.tasks) taskEvents(s.projectId, t, ctx);
  }

  for (const c of data.chats) {
    add(c.projectId, c.startedAt, "chat.start", { chat: c.id, title: c.title, sprint: c.sprintId });
    for (const a of c.agents) {
      add(c.projectId, a.startedAt, "agent.start", {
        chat: c.id,
        agent: a.id,
        kind: a.kind,
        name: a.name,
        task: a.task,
        doing: a.doing,
      });
      if (a.contextPct !== undefined)
        add(c.projectId, plus(a.startedAt, 1), "agent.context", {
          chat: c.id,
          agent: a.id,
          pct: a.contextPct,
        });
      if (a.endedAt) add(c.projectId, a.endedAt, "agent.end", { chat: c.id, agent: a.id });
    }
    // Sprint chats share the sprint's tasks, already emitted above.
    if (!c.sprintId) for (const t of c.tasks) taskEvents(c.projectId, t, { chat: c.id });
    if (c.endedAt) add(c.projectId, c.endedAt, "chat.end", { chat: c.id });
  }

  const cmdChat = data.chats.find((c) => c.id === data.lastCommand.chatId);
  if (cmdChat) add(cmdChat.projectId, data.lastCommand.at, "command", { chat: cmdChat.id });

  for (const d of data.docs)
    add(d.projectId, d.date ?? now, "doc.write", {
      kind: d.kind,
      id: d.id,
      title: d.title,
      path: `docs/${DOC_DIR[d.kind]}/${d.id}.md`,
      markdown: d.markdown,
      date: d.date,
    });

  const first = data.projects[0]?.id ?? "*";
  const { h5, week } = data.limits;
  for (const [window, l] of [
    ["5h", h5],
    ["week", week],
  ] as const)
    if (l) add(first, now, "limit", { project: "*", window, pct: l.pct, resetsAt: l.resetsAt });

  // dashboard-ia's real usage comes from its transcripts.
  for (const u of data.usage)
    if (u.projectId !== "dashboard-ia")
      add(u.projectId, `${u.date}T12:00:00.000Z`, "usage", {
        id: `sample-${u.projectId}-${u.date}`,
        model: "claude-opus-5-5",
        tokensIn: u.tokens,
        tokensOut: 0,
        cacheRead: 0,
        cacheWrite: 0,
      });

  for (const list of Object.values(out)) list.sort((a, b) => a.ts.localeCompare(b.ts));
  return out;
}

if (import.meta.main) {
  const dir = process.env.DASHBOARD_EVENTS_DIR ?? join(homedir(), ".main-harness", "events");
  mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const [project, list] of Object.entries(toEvents(mock, process.cwd()))) {
    writeFileSync(
      join(dir, `${project}.jsonl`),
      list.map((e) => JSON.stringify(e)).join("\n") + "\n",
    );
    count += list.length;
  }
  console.log(`${dir}: ${count} eventos`);
}
