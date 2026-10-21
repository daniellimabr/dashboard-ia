// @vitest-environment node
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { buildData } from "./data.ts";
import { openDb, type Db } from "./db.ts";
import { importEvent, importEvents } from "./events.ts";
import { seedPrices } from "./usage.ts";

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
  it("estimates the 5 h limit from spend and leaves the week empty without limit events", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    // 1 Mtok of opus input = US$ 4; h5Usd = 17 → 24%
    usage("2026-10-18T11:00:00Z", "u1", 1_000_000);
    usage("2026-10-18T05:00:00Z", "u2", 9_000_000);
    const { limits } = buildData(db, now);
    expect(limits.h5).toEqual({ pct: 24, estimated: true });
    expect(limits.week).toBeUndefined();
  });

  it("ignores an expired limit event", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    db.exec(
      "INSERT INTO limit_window VALUES ('5h', 90, '2026-10-18T10:00:00Z', '2026-10-18T05:00:00Z')",
    );
    expect(buildData(db, now).limits.h5.estimated).toBe(true);
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
    expect(buildData(db, NOW).docs.filter((d) => d.projectId === "dash")).toHaveLength(4);
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
