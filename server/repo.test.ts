// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { listDocs, readDocsFile, readPlan } from "./repo.ts";

const REPO = resolve(import.meta.dirname, "fixtures", "repo");
const ROOT = resolve(import.meta.dirname, "..");

describe("readDocsFile", () => {
  it("reads files inside docs", () => {
    expect(readDocsFile(REPO, "docs/backlog.md")).toContain("B001");
    expect(readDocsFile(REPO, "docs\\backlog.md")).toContain("B001");
  });

  it("refuses paths outside docs, absolute paths and missing files", () => {
    expect(readFileSync(join(REPO, "secret.md"), "utf8")).toContain("fora");
    for (const rel of [
      "secret.md",
      "docs/../secret.md",
      "../repo/secret.md",
      "docs/../../repo.test.ts",
      join(REPO, "docs", "backlog.md"),
      "/etc/passwd",
      "C:/Windows/win.ini",
      "docs",
      "docs/missing.md",
      "",
    ]) {
      expect(readDocsFile(REPO, rel), rel).toBeUndefined();
    }
  });

  describe("symlink out of docs", () => {
    const tmp = mkdtempSync(join(tmpdir(), "repo-test-"));
    afterAll(() => rmSync(tmp, { recursive: true, force: true }));
    mkdirSync(join(tmp, "docs"));
    mkdirSync(join(tmp, "out"));
    writeFileSync(join(tmp, "out", "x.md"), "secret");
    symlinkSync(join(tmp, "out"), join(tmp, "docs", "link"), "junction");

    it("is refused", () => {
      expect(readDocsFile(tmp, "docs/link/x.md")).toBeUndefined();
    });
  });
});

describe("readPlan", () => {
  it("reads title, goal, tasks, ranges and waves", () => {
    expect(readPlan(REPO, "docs/sprints/S01-plan.md")).toEqual({
      title: "Primeira sprint de teste",
      goal: "Testar o leitor de planos em duas linhas.",
      tasks: [
        {
          id: "T01",
          title: "Base do server/a.ts",
          agent: "tech-lead",
          deps: [],
          plannedMin: 15,
          wave: 1,
        },
        { id: "T02", title: "Segunda", agent: "clone", deps: ["T01"], plannedMin: 65, wave: 1 },
        {
          id: "T03",
          title: "Terceira",
          agent: "clone",
          deps: ["T01", "T02"],
          plannedMin: 120,
          wave: 2,
        },
        {
          id: "T04",
          title: "Revisão",
          agent: "reviewer",
          plannedModel: "opus",
          deps: ["T01", "T02", "T03"],
        },
      ],
    });
  });

  it("plan without table has no tasks; title without dash is kept whole", () => {
    expect(readPlan(REPO, "docs/sprints/S02-plan.md")).toEqual({
      title: "Plano sem tabela",
      goal: "Só texto.",
      tasks: [],
    });
  });

  it("reads waves from a list; ids only from the first sentence, first wave wins", () => {
    expect(readPlan(REPO, "docs/sprints/S00-plan.md")?.tasks.map((t) => t.wave)).toEqual([
      1, 1, 2, 2, 3,
    ]);
  });

  it("reads waves from a numbered list under a bare **Ondas:** line, ignoring parentheses", () => {
    const tasks = readPlan(REPO, "docs/sprints/S00-numbered-plan.md")?.tasks ?? [];
    expect(tasks.map((t) => [t.id, t.wave])).toEqual([
      ["T01", 1],
      ["T02", 1],
      ["T03", 1],
      ["T04", 2],
      ["T06", 2],
      ["T07", 2],
      ["T08", undefined],
    ]);
  });

  it("inline waves with a letter suffix are numbered by order of appearance", () => {
    const tmp = mkdtempSync(join(tmpdir(), "repo-test-"));
    mkdirSync(join(tmp, "docs", "sprints"), { recursive: true });
    const plan = (waves: string) =>
      [
        "# S00 — x",
        "",
        "## Tarefas",
        "",
        "| Id | Tarefa | Agente |",
        "| --- | --- | --- |",
        ...["T01", "T02", "T03", "T04", "T05"].map((id) => `| ${id} | t | clone |`),
        "",
        `**Ondas:** ${waves}`,
        "",
      ].join("\n");
    const waves = (w: string) => {
      writeFileSync(join(tmp, "docs", "sprints", "S00-plan.md"), plan(w));
      return readPlan(tmp, "docs/sprints/S00-plan.md")?.tasks.map((t) => t.wave);
    };
    try {
      expect(waves("(1) T01; (2) T02; (3b) T03 e T04; (4) T05")).toEqual([1, 2, 3, 3, 4]);
      expect(waves("(1) T01; (2) T02; (3) T03; (3b) T04 e T05")).toEqual([1, 2, 3, 4, 4]);
      expect(waves("(1) T01; (2) T02 e T03; (3) T04 e T05")).toEqual([1, 2, 2, 3, 3]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("reads inline (N) waves and splits the Agente column into role and model", () => {
    const tasks = readPlan(REPO, "docs/sprints/S00-paren-plan.md")?.tasks ?? [];
    expect(tasks.map((t) => [t.id, t.wave, t.agent, t.plannedModel])).toEqual([
      ["T01", 1, "clone", "sonnet"],
      ["T02", 2, "gemini", undefined],
      ["T03", 2, "tech-lead", undefined],
      ["T04", 3, "clone", "opus"],
    ]);
  });

  it("refuses paths outside docs", () => {
    expect(readPlan(REPO, "secret.md")).toBeUndefined();
    expect(readPlan(REPO, "docs/sprints/missing.md")).toBeUndefined();
  });

  it("parses this project's real plans", () => {
    for (const s of ["S01", "S02", "S03", "S04"]) {
      const p = readPlan(ROOT, `docs/sprints/${s}-plan.md`);
      expect(p?.title, s).toBeTruthy();
      expect(p?.tasks.length, s).toBeGreaterThan(4);
      for (const t of p?.tasks ?? []) expect(t.id, s).toMatch(/^T\d+$/);
    }
    const s04 = readPlan(ROOT, "docs/sprints/S04-plan.md");
    expect(s04?.title).toBe("Painel lendo os eventos reais do harness");
    expect(s04?.tasks.map((t) => t.wave)).toEqual([1, 1, 2, 1, 3, undefined]);
    expect(s04?.tasks[5]).toMatchObject({
      deps: ["T01", "T02", "T03", "T04", "T05"],
      plannedMin: 8,
    });
    // S09 (closed) lists waves under a bare **Paralelismo:** line
    const waves = readPlan(ROOT, "docs/sprints/S09-plan.md")?.tasks.map((t) => t.wave);
    expect(waves).toEqual([1, 1, 2, 2, 2, 2, 2, 3, 3]);
  });
});

describe("listDocs", () => {
  it("lists plans, releases, ADRs and PRDs", () => {
    const docs = listDocs(REPO, "p");
    expect(docs.map((d) => [d.id, d.kind, d.title]).sort()).toEqual([
      ["p:docs/adr/0001-x.md", "adr", "ADR 0001 — Decisão X"],
      ["p:docs/sprints/S00-hash-plan.md", "sprint-plan", "S00 — Plano em prosa"],
      ["p:docs/sprints/S00-numbered-plan.md", "sprint-plan", "S00 — Ondas numeradas"],
      ["p:docs/sprints/S00-paren-plan.md", "sprint-plan", "S00 — Ondas entre parênteses"],
      ["p:docs/sprints/S00-plan.md", "sprint-plan", "S00 — Ondas em lista"],
      ["p:docs/sprints/S01-plan.md", "sprint-plan", "S01 — Primeira `sprint` de teste"],
      ["p:docs/sprints/S01-release.md", "release-report", "Release Report S01"],
      ["p:docs/sprints/S02-plan.md", "sprint-plan", "Plano sem tabela"],
    ]);
    const adr = docs.find((d) => d.kind === "adr");
    expect(adr).toMatchObject({ projectId: "p", markdown: expect.stringContaining("Decidimos X") });
    expect(Date.parse(adr?.date ?? "")).not.toBeNaN();
  });

  it("missing folders give an empty list", () => {
    expect(listDocs(join(REPO, "nope"), "p")).toEqual([]);
  });
});
