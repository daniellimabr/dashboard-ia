// Reads a project's repo files, only inside <repo>/docs: sprint plans and the document list.
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { Doc } from "../src/data/types.ts";

export interface PlanTask {
  id: string;
  title: string;
  agent?: string;
  deps: string[];
  plannedMin?: number;
  wave?: number;
}
export interface Plan {
  title: string;
  goal?: string;
  tasks: PlanTask[];
}

/** Content of `rel` (relative to the repo, e.g. "docs/backlog.md"), or undefined if missing or its real path leaves <repo>/docs. */
export function readDocsFile(repo: string, rel: string): string | undefined {
  if (!rel || isAbsolute(rel) || /^[a-z]:/i.test(rel)) return undefined;
  try {
    // realpath resolves `..` and symlinks/junctions, so the check sees where the file really is.
    const docs = realpathSync(join(repo, "docs"));
    const file = realpathSync(resolve(repo, rel));
    const r = relative(docs, file);
    if (!r || r.startsWith("..") || isAbsolute(r)) return undefined;
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

/** "T01, T02" / "T01–T03" / "T01 e T02" -> ids, ranges expanded. */
const taskIds = (s: string): string[] =>
  [...s.matchAll(/T(\d+)(?:\s*[–-]\s*T(\d+))?/g)].flatMap(([, from = "", to = from]) => {
    const a = Number(from);
    return Array.from(
      { length: Math.max(Number(to) - a + 1, 1) },
      (_, i) => `T${String(a + i).padStart(from.length, "0")}`,
    );
  });

const minutes = (s: string): number | undefined => {
  const h = /(\d+)\s*h/.exec(s);
  const m = /(\d+)\s*min/.exec(s);
  return h || m ? Number(h?.[1] ?? 0) * 60 + Number(m?.[1] ?? 0) : undefined;
};

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

/** Plan at `rel` (from sprint.approved.data.plan); undefined if readDocsFile refuses it. No table -> tasks []. */
export function readPlan(repo: string, rel: string): Plan | undefined {
  const md = readDocsFile(repo, rel);
  if (md === undefined) return undefined;
  const lines = md.split(/\r?\n/);
  const h1 = lines.find((l) => l.startsWith("# "))?.slice(2) ?? "";
  const title = (h1.includes("— ") ? h1.slice(h1.indexOf("— ") + 2) : h1).replace(/`/g, "").trim();

  const section = (name: string) => {
    const i = lines.findIndex((l) => l.trim() === `## ${name}`);
    if (i < 0) return [];
    const end = lines.findIndex((l, j) => j > i && l.startsWith("## "));
    return lines.slice(i + 1, end < 0 ? undefined : end);
  };

  const body = section("Objetivo");
  const start = body.findIndex((l) => l.trim());
  const stop = body.findIndex((l, j) => j > start && !l.trim());
  const para = start < 0 ? [] : body.slice(start, stop < 0 ? undefined : stop);
  const goal = para.map((l) => l.trim()).join(" ") || undefined;

  const waves = new Map<string, number>();
  const waveLine = lines.find((l) => /^\*\*(Paralelismo|Ondas):\*\*/.test(l)) ?? "";
  for (const m of waveLine.matchAll(/onda\s+(\d+)\s*=(.*?)(?=onda\s+\d+\s*=|revis[aã]o\s*=|$)/gi)) {
    for (const id of taskIds(m[2] ?? "")) waves.set(id, Number(m[1]));
  }
  // list formats; the line above wins. S09: "- **Onda 1:** T01 e T02. Texto livre...";
  // 6thGear: "1. T01, T02 em paralelo." right under a bare **Ondas:** line (only that contiguous list)
  if (!waves.size) {
    const items = lines.map((l) => /^\s*-\s*\*\*Onda\s+(\d+):\*\*(.*)/i.exec(l));
    const bare = lines.findIndex((l) => /^\*\*(Paralelismo|Ondas):\*\*\s*$/.test(l));
    for (const l of bare < 0 ? [] : lines.slice(bare + 1)) {
      if (!l.trim()) continue;
      const m = /^(\d+)\.\s+(.*)/.exec(l);
      if (!m) break;
      items.push(m);
    }
    for (const m of items) {
      // only the first sentence without parentheses, and the first wave wins:
      // other text names other tasks ("depois de T03", "(T07 só precisa da T02)")
      const first = m?.[2]?.split(/\.\s/)[0]?.replace(/\([^)]*\)/g, "") ?? "";
      for (const id of taskIds(first)) if (!waves.has(id)) waves.set(id, Number(m?.[1]));
    }
  }

  const rows = section("Tarefas").filter((l) => l.trim().startsWith("|"));
  const head = rows[0] ? cells(rows[0]).map((c) => c.toLowerCase()) : [];
  const col = (r: string[], name: string) => {
    const i = head.indexOf(name.toLowerCase()); // S03 used "ID"
    return i < 0 ? undefined : r[i];
  };
  const tasks = rows.slice(2).flatMap((line): PlanTask[] => {
    const r = cells(line);
    const id = col(r, "Id") ?? "";
    if (!/^T\d+$/.test(id)) return [];
    const agent = col(r, "Agente");
    const planned = minutes(col(r, "Planejado") ?? "");
    const wave = waves.get(id);
    return [
      {
        id,
        title: (col(r, "Tarefa") ?? "").replace(/`/g, ""),
        ...(agent && { agent }),
        deps: taskIds(col(r, "Depende de") ?? ""),
        ...(planned !== undefined && { plannedMin: planned }),
        ...(wave !== undefined && { wave }),
      },
    ];
  });
  return { title, ...(goal && { goal }), tasks };
}

const DOC_DIRS: [dir: string, suffix: string, kind: Doc["kind"]][] = [
  ["docs/sprints", "-plan.md", "sprint-plan"],
  ["docs/sprints", "-release.md", "release-report"],
  ["docs/adr", ".md", "adr"],
  ["docs/prd", ".md", "prd"],
];

/** Plans, Release Reports, ADRs and PRDs of the repo, markdown read now. Missing folder = nothing. */
export function listDocs(repo: string, projectId: string): Doc[] {
  return DOC_DIRS.flatMap(([dir, suffix, kind]) => {
    let names: string[];
    try {
      names = readdirSync(join(repo, dir)).filter((n) => n.endsWith(suffix));
    } catch {
      return [];
    }
    return names.flatMap((n): Doc[] => {
      const rel = `${dir}/${n}`;
      const markdown = readDocsFile(repo, rel);
      if (markdown === undefined) return [];
      const h1 = /^# (.+)$/m.exec(markdown)?.[1]?.trim();
      const date = statSync(join(repo, rel)).mtime.toISOString();
      return [{ id: `${projectId}:${rel}`, projectId, kind, title: h1 ?? n, date, markdown }];
    });
  });
}
