// @vitest-environment node
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { buildData } from "./data.ts";
import { openDb, type Db } from "./db.ts";
import { importEvent, importEvents } from "./events.ts";
import { importUsage, seedPrices } from "./usage.ts";

let db: Db;
beforeEach(() => {
  db = openDb(":memory:");
  seedPrices(db);
});

let seq = 0;
const ev = (type: string, ts: string, data: object = {}, env: object = {}) =>
  importEvent(
    db,
    JSON.stringify({
      v: 1,
      id: `e${++seq}`,
      ts,
      project: "p1",
      session: null,
      sprint: null,
      task: null,
      agent: null,
      type,
      data,
      ...env,
    }),
  );
const usage = (ts: string, id: string, input: number, output = 0) =>
  ev("usage", ts, {
    model: "claude-opus-5-5",
    input,
    output,
    cache_write: 0,
    cache_read: 0,
    usd: null,
    message_id: id,
    transcript: "main",
  });

describe("buildData", () => {
  it("without a reading, estimates 5 h from the last 5 h and the week from the last 7 days", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    // 1 Mtok of opus input = US$ 4; H5_USD = 30 → 13%; week: (4 + 36) / 227 → 18%
    usage("2026-10-18T11:00:00Z", "u1", 1_000_000);
    usage("2026-10-18T05:00:00Z", "u2", 9_000_000);
    const { limits } = buildData(db, now);
    expect(limits.h5).toEqual({ pct: 13, estimated: true });
    expect(limits.week).toEqual({ pct: 18, estimated: true });
  });

  it("caps the estimate at 100", () => {
    usage("2026-10-18T11:00:00Z", "u1", 20_000_000); // US$ 80 > 30
    expect(buildData(db, Date.parse("2026-10-18T12:00:00Z")).limits.h5.pct).toBe(100);
  });

  it("adds the spend since the last reading to its pct, marked estimated", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    db.exec(
      "INSERT INTO limit_window VALUES ('5h', 40, '2026-10-18T14:00:00Z', '2026-10-18T10:00:00Z')",
    );
    usage("2026-10-18T09:00:00Z", "old", 5_000_000); // before the reading: ignored
    usage("2026-10-18T11:00:00Z", "u1", 1_500_000); // US$ 6 → +20 points
    expect(buildData(db, now).limits.h5).toEqual({
      pct: 60,
      resetsAt: "2026-10-18T14:00:00Z",
      estimated: true,
    });
  });

  it("keeps the pct when nothing was spent since the reading", () => {
    db.exec(
      "INSERT INTO limit_window VALUES ('5h', 40, '2026-10-18T14:00:00Z', '2026-10-18T10:00:00Z')",
    );
    expect(buildData(db, Date.parse("2026-10-18T12:00:00Z")).limits.h5).toEqual({
      pct: 40,
      resetsAt: "2026-10-18T14:00:00Z",
    });
  });

  it("after the reset, estimates only from the spend since resets_at, for both windows", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    db.exec(`INSERT INTO limit_window VALUES ('5h', 90, '2026-10-18T10:00:00Z', '2026-10-18T09:00:00Z');
      INSERT INTO limit_window VALUES ('week', 50, '2026-10-18T10:00:00Z', '2026-10-17T09:00:00Z')`);
    usage("2026-10-18T09:30:00Z", "before", 9_000_000); // before the reset: ignored
    usage("2026-10-18T11:00:00Z", "u1", 1_500_000); // US$ 6 → 20% of 5 h, 3% of the week
    const { limits } = buildData(db, now);
    expect(limits.h5).toEqual({ pct: 20, estimated: true });
    expect(limits.week).toEqual({ pct: 3, estimated: true });
  });

  it("a limit turn after the reading shows 100% until the reset", () => {
    db.exec(
      "INSERT INTO limit_window VALUES ('5h', 40, '2026-10-18T14:00:00Z', '2026-10-18T10:00:00Z')",
    );
    db.exec("INSERT INTO turn (chat_id, at, kind) VALUES ('c1', '2026-10-18T09:00:00Z', 'limit')");
    expect(buildData(db, Date.parse("2026-10-18T12:00:00Z")).limits.h5.pct).toBe(40); // older turn
    db.exec("INSERT INTO turn (chat_id, at, kind) VALUES ('c1', '2026-10-18T11:00:00Z', 'limit')");
    expect(buildData(db, Date.parse("2026-10-18T12:00:00Z")).limits.h5).toEqual({
      pct: 100,
      resetsAt: "2026-10-18T14:00:00Z",
      estimated: true,
    });
  });

  it("reports the real limits from usage.limits: newest wins, bad dates and out-of-range pct are handled", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    const limits = (ts: string, five: number, fiveAt: string, week: number, weekAt: string) =>
      ev("usage.limits", ts, {
        five_hour: five,
        five_hour_resets_at: fiveAt,
        seven_day: week,
        seven_day_resets_at: weekAt,
      });
    limits("2026-10-18T11:00:00Z", 120, "2026-10-18T14:00:00Z", 18, "2026-10-22T09:00:00Z");
    limits("2026-10-18T10:00:00Z", 5, "2026-10-18T13:00:00Z", 1, "2026-10-21T09:00:00Z"); // older: ignored
    limits("2026-10-18T11:30:00Z", 60, "garbage", 20, "2026-10-22T09:00:00Z"); // bad 5 h date: skipped
    expect(buildData(db, now).limits).toMatchObject({
      h5: { pct: 100, resetsAt: "2026-10-18T14:00:00Z" },
      week: { pct: 20, resetsAt: "2026-10-22T09:00:00Z" },
    });
    expect(buildData(db, now).limits.h5.estimated).toBeUndefined();
  });

  it("an expired reading with no spend since the reset starts at 0", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    db.exec(
      "INSERT INTO limit_window VALUES ('5h', 90, '2026-10-18T10:00:00Z', '2026-10-18T05:00:00Z')",
    );
    expect(buildData(db, now).limits.h5).toEqual({ pct: 0, estimated: true });
  });

  it("reports promoted projects and sprint spend", () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 1 }, { sprint: "S01" });
    usage("2026-10-18T11:00:00Z", "u1", 0, 100_000);
    db.exec("UPDATE project SET promoted = 1");
    const d = buildData(db, Date.parse("2026-10-18T12:00:00Z"));
    expect(d.projects[0]?.promoted).toBe(true);
    expect(d.sprints[0]?.usd).toBeCloseTo(2);
  });
});

describe("sprint consumption by model", () => {
  const row = (id: string, ts: string, model: string, input: number, output: number) =>
    ev("usage", ts, { model, input, output, cache_read: 5, cache_write: 5, message_id: id });
  it("sums tokens and US$ per model; Gemini is external with US$ 0; no consumption = no byModel", () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 1 }, { sprint: "S01" });
    ev("sprint.open", "2026-10-18T20:00:00Z", { tasks: 1 }, { sprint: "S02" });
    row("a", "2026-10-18T11:00:00Z", "claude-opus-5-5", 1_000_000, 0);
    row("b", "2026-10-18T11:10:00Z", "claude-opus-5-5", 0, 100_000);
    row("c", "2026-10-18T11:20:00Z", "gemini-2.5-pro", 1000, 2000);
    const { sprints } = buildData(db, Date.parse("2026-10-18T12:00:00Z"));
    const [s1, s2] = sprints;
    expect(s1?.byModel).toEqual([
      {
        model: "claude-opus-5-5",
        input: 1_000_000,
        output: 100_000,
        cache: 20,
        usd: expect.closeTo(6, 3),
      },
      { model: "gemini-2.5-pro", input: 1000, output: 2000, cache: 10, usd: 0, external: true },
    ]);
    expect(s2?.byModel).toBeUndefined();
  });
});

describe("consumption by kind with % of the windows", () => {
  const NOW = Date.parse("2026-10-18T12:00:00Z");
  const env = (task: string | null, agent: string | null) => ({
    session: "c1",
    sprint: "S01",
    task,
    agent,
  });
  const use = (id: string, ts: string, model: string, aid?: string) =>
    ev("usage", ts, {
      model,
      input: 1_000_000,
      output: 100_000,
      cache_read: 10,
      cache_write: 20,
      message_id: id,
      ...(aid && { agent_id: aid }),
    });
  const pcts = (usd: number) => ({ pct5h: (usd / 30) * 100, pctWeek: (usd / 227) * 100 });

  it("sprint: four kinds sum to the tokens by model, with US$ and % from the constants", () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 1 }, env(null, "tech-lead"));
    use("a", "2026-10-18T11:00:00Z", "claude-opus-5-5");
    const sp = buildData(db, NOW).sprints[0];
    const m = sp?.byModel?.[0];
    const c = sp?.consumption;
    expect(c).toMatchObject({ input: 1_000_000, output: 100_000, cacheRead: 10, cacheWrite: 20 });
    expect((c?.input ?? 0) + (c?.output ?? 0) + (c?.cacheRead ?? 0) + (c?.cacheWrite ?? 0)).toBe(
      (m?.input ?? 0) + (m?.output ?? 0) + (m?.cache ?? 0),
    );
    expect(c?.usd).toBeCloseTo(6, 3);
    expect(c?.pct5h).toBeCloseTo(pcts(c?.usd ?? 0).pct5h, 9);
    expect(c?.pctWeek).toBeCloseTo(pcts(c?.usd ?? 0).pctWeek, 9);
  });

  it("sprint without usage has no consumption; a model without price costs 0 without breaking", () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 1 }, env(null, "tech-lead"));
    expect(buildData(db, NOW).sprints[0]?.consumption).toBeUndefined();
    use("x", "2026-10-18T11:00:00Z", "mystery-model");
    expect(buildData(db, NOW).sprints[0]?.consumption).toMatchObject({ input: 1_000_000, usd: 0 });
  });

  it("task without its own subagent (Tech Lead or none) has no consumption: no shared window split", () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 2 }, env(null, "tech-lead"));
    ev("task.start", "2026-10-18T10:01:00Z", {}, env("T01", "main-harness:tech-lead"));
    ev("task.start", "2026-10-18T10:20:00Z", {}, { sprint: "S01", task: "T02" });
    use("in", "2026-10-18T10:30:00Z", "claude-opus-5-5");
    const tasks = buildData(db, NOW).sprints[0]?.tasks ?? [];
    expect(tasks.map((t) => t.consumption)).toEqual([undefined, undefined]);
  });

  it("task without start has no consumption", () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 1 }, env(null, "tech-lead"));
    use("a", "2026-10-18T11:00:00Z", "claude-opus-5-5");
    ev("task.start", "2026-10-18T10:01:00Z", {}, { sprint: "S01", task: "T01" });
    db.exec("UPDATE task SET started_at = NULL");
    expect(buildData(db, NOW).sprints[0]?.tasks[0]?.consumption).toBeUndefined();
  });
});

describe("derived state from harness events and the repo", () => {
  const NOW = Date.parse("2026-10-18T10:20:00Z");
  const fixture = () => {
    const dir = mkdtempSync(join(tmpdir(), "data-"));
    copyFileSync(
      new URL("fixtures/harness-events.jsonl", import.meta.url),
      join(dir, "2026-10-18.jsonl"),
    );
    importEvents(db, dir);
    db.prepare("UPDATE project SET name = 'Dash', repo_path = ? WHERE id = 'dash'").run(
      fileURLToPath(new URL("fixtures/repo", import.meta.url)),
    );
  };
  const dash = (d = buildData(db, NOW)) => d.projects.find((p) => p.id === "dash");
  const s01 = (d = buildData(db, NOW)) =>
    d.sprints.find((s) => s.projectId === "dash" && s.id === "S01");
  const done = (task: string, ts: string) =>
    ev(
      "task.done",
      ts,
      { duration_s: 60 },
      { project: "dash", session: "s1", sprint: "S01", task },
    );

  it("takes sprint title, goal and tasks from the plan, with the plan's schedule", () => {
    fixture();
    const s = s01();
    expect(s?.title).toBe("Primeira sprint de teste");
    expect(s?.goal).toBe("Testar o leitor de planos em duas linhas.");
    expect(s?.tasks.map((t) => [t.id, t.title, t.done, t.wave])).toEqual([
      ["T01", "Base do server/a.ts", false, 1],
      ["T02", "Segunda", true, 1],
      ["T03", "Terceira", false, 2],
      ["T04", "Revisão", false, undefined],
    ]);
    expect(s?.tasks[2]?.plan).toEqual({ start: 80, duration: 120, deps: ["T01", "T02"] });
    expect(s?.tasks[3]?.agent).toBe("reviewer");
  });

  it("derives phase, alerts, next step and the event texts", () => {
    fixture();
    const p = dash();
    expect(p?.phase).toEqual({ label: "Execução", tone: "run", live: true });
    expect(p?.alerts).toEqual([
      { tone: "bad", title: "Reviewer reprovou T01", detail: "1ª reprovação" },
      {
        tone: "warn",
        title: "Plano da S02 esperando aprovação",
        detail: "Aprove para abrir a sprint.",
      },
    ]);
    expect(p?.nextStep?.title).toBe("Corrigir a T01");
    expect(p?.events?.map((e) => [e.kind, e.text])).toEqual([
      ["ok", "S01 aprovada"],
      ["run", "S01 aberta"],
      ["run", "T01 iniciada"],
      ["run", "T02 iniciada"],
      ["bad", "T01 reprovada (1/2)"],
      ["ok", "T02 concluída"],
      ["warn", "S01: 2 ajustes pedidos"],
    ]);
    expect(p?.whereStopped).toBe("S01: 2 ajustes pedidos");
    expect(p?.backlog).toContain("Backlog");
    expect(buildData(db, NOW).docs.filter((d) => d.projectId === "dash")).toHaveLength(8);
  });

  describe("plan outside the harness pattern", () => {
    const planAlert = () =>
      dash()?.alerts?.find((a) => a.title === "Plano fora do padrão do harness");
    const withPlan = (name: string, md?: string) => {
      fixture();
      if (md === undefined)
        return db.exec(`UPDATE sprint SET plan_path = 'docs/sprints/${name}' WHERE id = 'S01'`);
      const repo = mkdtempSync(join(tmpdir(), "repo-"));
      mkdirSync(join(repo, "docs", "sprints"), { recursive: true });
      writeFileSync(join(repo, "docs", "sprints", name), md);
      db.prepare("UPDATE project SET repo_path = ? WHERE id = 'dash'").run(repo);
      db.exec(`UPDATE sprint SET plan_path = 'docs/sprints/${name}' WHERE id = 'S01'`);
    };

    it("warns when the plan has no task table", () => {
      withPlan("S00-hash-plan.md");
      expect(planAlert()).toEqual({
        tone: "warn",
        title: "Plano fora do padrão do harness",
        detail: "0 tarefas lidas em S00-hash-plan.md",
      });
    });

    it("warns on an empty plan file", () => {
      withPlan("S54-plan.md", "");
      expect(planAlert()?.detail).toBe("0 tarefas lidas em S54-plan.md");
    });

    it("warns about tasks without planned minutes", () => {
      withPlan(
        "S54-plan.md",
        "# S54\n\n## Tarefas\n\n| Id | Tarefa | Agente |\n|---|---|---|\n| T01 | A | clone |\n| T02 | B | clone |\n",
      );
      expect(planAlert()?.detail).toBe("2 tarefas sem minutos planejados");
    });

    it("stays quiet for a missing plan and for a plan in the pattern", () => {
      withPlan("S99-plan.md");
      expect(planAlert()).toBeUndefined();
      fixture();
      expect(planAlert()).toBeUndefined();
    });
  });

  it("is waiting for Daniel when every task of sprint.open is done", () => {
    fixture();
    done("T01", "2026-10-18T10:16:00Z");
    const d = buildData(db, NOW);
    expect(s01(d)?.deliveredAt).toBe("2026-10-18T10:16:00Z");
    expect(dash(d)?.phase).toEqual({ label: "Esperando você", tone: "warn" });
    expect(dash(d)?.alerts?.[0]).toEqual({
      tone: "warn",
      title: "Testar a entrega da S01",
      detail: "Todas as tarefas estão prontas.",
    });
    expect(dash(d)?.nextStep?.title).toBe("Testar a entrega da S01");
  });

  it("shows the plan phase once the sprint is closed and a newer plan waits", () => {
    fixture();
    ev("sprint.close", "2026-10-18T10:17:00Z", {}, { project: "dash", sprint: "S01" });
    expect(dash()?.phase).toEqual({ label: "Plano", tone: "warn" });
    expect(dash()?.events?.at(-1)).toMatchObject({ kind: "ok", text: "S01 fechada" });
  });

  it("ends a chat without session.end, and its agents, at their last activity once idle", () => {
    ev(
      "task.start",
      "2026-10-18T09:00:00Z",
      {},
      { session: "c1", sprint: "S01", task: "T01", agent: "tech-lead" },
    );
    ev(
      "task.start",
      "2026-10-18T09:10:00Z",
      {},
      { session: "c1", sprint: "S01", task: "T02", agent: "clone" },
    );
    ev(
      "task.done",
      "2026-10-18T09:20:00Z",
      {},
      { session: "c1", sprint: "S01", task: "T01", agent: "tech-lead" },
    );
    const chat = (now: number) => buildData(db, now).chats.find((c) => c.id === "c1");
    const busy = chat(Date.parse("2026-10-18T09:35:00Z"));
    expect(busy?.endedAt).toBeUndefined();
    expect(busy?.agents.every((a) => a.endedAt === undefined)).toBe(true);
    const idle = chat(Date.parse("2026-10-18T12:00:00Z"));
    expect(idle?.endedAt).toBe("2026-10-18T09:20:00Z");
    expect(Object.fromEntries(idle?.agents.map((a) => [a.id, a.endedAt]) ?? [])).toEqual({
      "c1:tech-lead": "2026-10-18T09:20:00Z",
      "c1:clone": "2026-10-18T09:10:00Z",
    });
  });

  it("makes one agent per agent_id of agent.start, with the task of the event", () => {
    const start = (aid: string, task: string | null, ts: string) =>
      ev(
        "agent.start",
        ts,
        { agent_id: aid },
        { session: "c1", sprint: "S01", task, agent: "main-harness:executor" },
      );
    start("k1", "T02", "2026-10-18T09:00:00Z");
    start("k2", null, "2026-10-18T09:00:01Z");
    ev(
      "agent.end",
      "2026-10-18T09:05:00Z",
      { agent_id: "k1" },
      { session: "c1", sprint: "S01", agent: "main-harness:executor" },
    );
    const agents = buildData(db, Date.parse("2026-10-18T09:06:00Z")).chats[0]?.agents ?? [];
    expect(agents.map((a) => [a.id, a.name, a.kind, a.task, a.endedAt])).toEqual([
      ["c1:k1", "Clone 1", "clone", "T02", "2026-10-18T09:05:00Z"],
      ["c1:k2", "Clone 2", "clone", undefined, undefined],
    ]);
  });

  it("uses the last session.start as the last command", () => {
    fixture();
    expect(buildData(db, NOW).lastCommand).toEqual({ at: "2026-10-18T10:01:00Z", chatId: "s1" });
  });

  it("refuses a plan path outside docs", () => {
    fixture();
    db.exec("UPDATE sprint SET plan_path = '../secret.md' WHERE id = 'S01'");
    expect(s01()?.title).toBe("S01");
  });
});

describe("real per-agent spend, task agent and waits from the transcripts", () => {
  const NOW = Date.parse("2026-10-18T12:00:00Z");
  const env = (task: string | null, agent: string) => ({
    session: "c1",
    sprint: "S01",
    task,
    agent,
  });
  const setup = () => {
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 2 }, env(null, "tech-lead"));
    ev("task.start", "2026-10-18T10:01:00Z", {}, env("T01", "tech-lead"));
    ev(
      "task.phase",
      "2026-10-18T10:30:00Z",
      { phase: "fila" },
      env("T01", "main-harness:tech-lead"),
    );
    ev(
      "task.phase",
      "2026-10-18T10:40:00Z",
      { phase: "revisão" },
      env("T01", "main-harness:reviewer"),
    );
    ev("task.start", "2026-10-18T10:02:00Z", {}, { sprint: "S01", task: "T02" }); // no agent
    ev("sprint.open", "2026-10-18T09:00:00Z", { tasks: 1 }, { session: "c2", sprint: "S02" });
    const root = mkdtempSync(join(tmpdir(), "tx-"));
    const dir = join(root, "C--x");
    const sub = join(dir, "c1", "subagents");
    mkdirSync(sub, { recursive: true });
    copyFileSync(new URL("fixtures/sprint-chat.jsonl", import.meta.url), join(dir, "c1.jsonl"));
    const line = (agentId: string, id: string) =>
      `{"type":"assistant","cwd":"C:\\\\x","sessionId":"c1","agentId":"${agentId}","timestamp":"2026-10-18T10:35:00Z","message":{"id":"${id}","model":"claude-haiku-4-5","usage":{"input_tokens":1000000}}}\n`;
    writeFileSync(join(sub, "agent-a1.jsonl"), line("a1", "s1"));
    writeFileSync(join(sub, "agent-a1.meta.json"), `{"agentType":"main-harness:tech-lead"}`);
    writeFileSync(join(sub, "agent-a2.jsonl"), line("a2", "s2")); // no meta: not attributed
    importUsage(db, root, [{ id: "p1", repoPath: "C:/x" }]);
    return buildData(db, NOW);
  };

  it("sums tokens and US$ per agent; an agent without usage has no data", () => {
    const agents = setup().chats.find((c) => c.id === "c1")?.agents ?? [];
    const by = Object.fromEntries(agents.map((a) => [a.id, [a.tokens, a.usd]]));
    expect(by).toEqual({
      "c1:tech-lead": [1_000_000, 4],
      "c1:main-harness:tech-lead": [1_000_000, 1],
      "c1:main-harness:reviewer": [undefined, undefined],
    });
  });

  it("agent consumption by kind; the task takes its agent's", () => {
    const d = setup();
    const agents = d.chats.find((c) => c.id === "c1")?.agents ?? [];
    const lead = agents.find((a) => a.id === "c1:main-harness:tech-lead");
    expect(lead?.consumption).toEqual({
      input: 1_000_000,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      usd: 1,
      pct5h: (1 / 30) * 100,
      pctWeek: (1 / 227) * 100,
    });
    expect(agents.find((a) => a.id === "c1:main-harness:reviewer")?.consumption).toBeUndefined();
    // The Tech Lead agent is the whole chat: its task shows no consumption.
    expect(d.sprints.find((s) => s.id === "S01")?.tasks[0]?.consumption).toBeUndefined();
  });

  it("'reviewer' and 'main-harness:reviewer' are one agent", () => {
    ev("review.pass", "2026-10-18T10:45:00Z", {}, env("T01", "reviewer"));
    const ids = setup()
      .chats.find((c) => c.id === "c1")
      ?.agents.map((a) => a.id);
    expect(ids?.filter((id) => id.endsWith("reviewer"))).toEqual(["c1:main-harness:reviewer"]);
  });

  it("usage read before the subagent's .meta.json existed gets its type later", () => {
    const root = mkdtempSync(join(tmpdir(), "tx-"));
    const sub = join(root, "C--x", "c1", "subagents");
    mkdirSync(sub, { recursive: true });
    const line = (id: string) =>
      `{"type":"assistant","cwd":"C:\\\\x","sessionId":"c1","agentId":"a3","timestamp":"2026-10-18T10:35:00Z","message":{"id":"${id}","model":"claude-haiku-4-5","usage":{"input_tokens":1000000}}}\n`;
    const file = join(sub, "agent-a3.jsonl");
    const projects = [{ id: "p1", repoPath: "C:/x" }];
    writeFileSync(file, line("m1"));
    importUsage(db, root, projects);
    writeFileSync(join(sub, "agent-a3.meta.json"), `{"agentType":"main-harness:reviewer"}`);
    writeFileSync(file, line("m1") + line("m2"));
    importUsage(db, root, projects);
    expect(db.prepare("SELECT id, agent_type t FROM usage ORDER BY id").all()).toEqual([
      { id: "m1", t: "main-harness:reviewer" },
      { id: "m2", t: "main-harness:reviewer" },
    ]);
  });

  it("links a task to the last non-reviewer agent that touched it", () => {
    const tasks = setup().sprints.find((s) => s.id === "S01")?.tasks ?? [];
    expect(tasks.map((t) => [t.id, t.agentId])).toEqual([
      ["T01", "c1:main-harness:tech-lead"],
      ["T02", undefined],
    ]);
  });

  it("finds Daniel's reply waits and limit waits inside the sprint window", () => {
    const d = setup();
    expect(d.sprints.find((s) => s.id === "S01")?.waits).toEqual([
      { kind: "reply", start: "2026-10-18T10:00:00.000Z", end: "2026-10-18T10:05:00.000Z" },
      { kind: "reply", start: "2026-10-18T10:15:00.000Z", end: "2026-10-18T10:20:00.000Z" },
      { kind: "limit", start: "2026-10-18T10:21:00.000Z", end: "2026-10-18T11:00:00.000Z" },
    ]);
    // S02's chat has no transcript: no data, not "no waits"
    expect(d.sprints.find((s) => s.id === "S02")?.waits).toBeUndefined();
  });
});

describe("cost by token kind and task participants", () => {
  const NOW = Date.parse("2026-10-18T12:00:00Z");
  const env = (task: string | null, agent: string | null) => ({
    session: "c1",
    sprint: "S01",
    task,
    agent,
  });
  const open = () =>
    ev("sprint.open", "2026-10-18T10:00:00Z", { tasks: 2 }, env(null, "tech-lead"));
  const tasks = () => buildData(db, NOW).sprints[0]?.tasks ?? [];

  it("a reopened clone and a Reviewer with two reviews count one pass per start/reopen/review", () => {
    open();
    ev("task.start", "2026-10-18T10:01:00Z", {}, env("T01", "main-harness:executor"));
    ev("review.result", "2026-10-18T10:10:00Z", { result: "fail" }, env("T01", "reviewer"));
    ev(
      "task.phase",
      "2026-10-18T10:11:00Z",
      { phase: "código" },
      env("T01", "main-harness:executor"),
    );
    ev(
      "task.phase",
      "2026-10-18T10:12:00Z",
      { phase: "lint" },
      env("T01", "main-harness:executor"),
    );
    ev("review.result", "2026-10-18T10:20:00Z", { result: "pass" }, env("T01", "reviewer"));
    expect(tasks()[0]?.participants).toEqual([
      { agent: "clone", passes: 2 },
      { agent: "reviewer", passes: 2 },
    ]);
  });

  it("two task.start of the same clone are two passes; no agent on the event = no participants", () => {
    open();
    ev("task.start", "2026-10-18T10:01:00Z", {}, env("T01", "main-harness:executor"));
    ev("task.start", "2026-10-18T10:30:00Z", {}, env("T01", "main-harness:executor"));
    ev("task.start", "2026-10-18T10:02:00Z", {}, env("T02", null));
    expect(tasks().map((t) => t.participants)).toEqual([[{ agent: "clone", passes: 2 }], []]);
  });

  it("per-kind US$ sums, model by model, to the agent's total; all-tech-lead stays one agent", () => {
    open();
    ev("task.start", "2026-10-18T10:01:00Z", {}, env("T01", "tech-lead"));
    const use = (id: string, model: string) =>
      db
        .prepare(
          "INSERT INTO usage VALUES (?, 'p1', 'c1', NULL, '2026-10-18T11:00:00Z', ?, 1000000, 100000, 3000000, 200000, NULL)",
        )
        .run(id, model);
    use("a", "claude-opus-5-5");
    use("b", "claude-sonnet-5-5");
    const agents = buildData(db, NOW).chats[0]?.agents ?? [];
    expect(agents.map((a) => a.id)).toEqual(["c1:tech-lead"]);
    const a = agents[0];
    const k = a?.costByKind;
    expect(k?.input).toBeCloseTo(6, 6); // 4 + 2
    expect(k?.cacheRead).toBeCloseTo(1.2, 6); // 0.6 + 0.6
    expect(
      (k?.input ?? 0) + (k?.output ?? 0) + (k?.cacheRead ?? 0) + (k?.cacheWrite ?? 0),
    ).toBeCloseTo(a?.usd ?? -1, 9);
    expect(tasks()[0]?.participants).toEqual([{ agent: "tech-lead", passes: 1 }]);
  });
});
