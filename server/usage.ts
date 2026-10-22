// Claude Code transcripts (~/.claude/projects/**/*.jsonl) -> `usage` rows, plus the `price` table.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { importLines, type Db } from "./db.ts";

export const DEFAULT_TRANSCRIPTS = join(homedir(), ".claude", "projects");

const norm = (p: string) => {
  const s = p.replace(/\\/g, "/").replace(/\/+$/, "");
  return process.platform === "win32" ? s.toLowerCase() : s;
};

interface Line {
  cwd?: string;
  sessionId?: string;
  agentId?: string;
  timestamp?: string;
  message?: {
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

/** Imports new transcript lines under `root`; returns the number of lines read. */
export function importUsage(
  db: Db,
  root: string,
  projects: { id: string; repoPath: string }[],
): number {
  if (!existsSync(root)) return 0;
  const byPath = new Map(projects.map((p) => [norm(p.repoPath), p.id]));
  // Several lines repeat one message.id (one content block each); the id keys the row.
  const upsert = db.prepare(
    `INSERT INTO usage (id, project_id, chat_id, agent_id, at, model, tokens_in, tokens_out, cache_read, cache_write)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET tokens_in = excluded.tokens_in, tokens_out = excluded.tokens_out,
       cache_read = excluded.cache_read, cache_write = excluded.cache_write`,
  );
  const handle = (raw: string) => {
    const l = JSON.parse(raw) as Line;
    const m = l.message;
    const u = m?.usage;
    if (!u || !m?.id || !l.cwd || !l.timestamp) return;
    const projectId = byPath.get(norm(l.cwd));
    if (!projectId) return;
    upsert.run(
      m.id,
      projectId,
      l.sessionId ?? null,
      l.agentId ?? null,
      l.timestamp,
      m.model ?? "",
      u.input_tokens ?? 0,
      u.output_tokens ?? 0,
      u.cache_read_input_tokens ?? 0,
      u.cache_creation_input_tokens ?? 0,
    );
  };
  let n = 0;
  for (const rel of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    if (rel.endsWith(".jsonl")) n += importLines(db, join(root, rel), handle);
  }
  return n;
}

// US$ per Mtok: input, output, cache read, cache write (5 min). Source: claude-api skill, 2026-10.
const PRICES: [string, number, number, number, number][] = [
  ["claude-opus-5-5", 4, 20, 0.2, 5],
  ["claude-sonnet-5", 2, 10, 0.2, 2.5],
  ["claude-haiku-4-5", 1, 5, 0.1, 1.25],
  ["claude", 4, 20, 0.2, 5], // any other Claude model: priced as Opus 5.5
];

/** Inserts the default prices; rows already present (possibly edited) are kept. */
export function seedPrices(db: Db): void {
  const ins = db.prepare("INSERT OR IGNORE INTO price VALUES (?, ?, ?, ?, ?)");
  for (const p of PRICES) ins.run(...p);
}

/** US$ of one `usage` row `u`: the price whose model is the longest prefix of u.model; none = 0. */
export const USD_SQL = `coalesce((SELECT (coalesce(u.tokens_in, 0) * p.in_per_mtok + coalesce(u.tokens_out, 0) * p.out_per_mtok
  + coalesce(u.cache_read, 0) * p.cache_read_per_mtok + coalesce(u.cache_write, 0) * p.cache_write_per_mtok) / 1e6
  FROM price p WHERE substr(u.model, 1, length(p.model)) = p.model ORDER BY length(p.model) DESC LIMIT 1), 0)`;

/** SQL: the sprint whose window [started_at, closed_at or now (?2)] holds usage row `u`; latest start wins. Same window as the sprint's spend. */
const SPRINT_OF_SQL = `(SELECT s.id FROM sprint s WHERE s.project_id = u.project_id AND s.started_at IS NOT NULL
  AND julianday(u.at) BETWEEN julianday(s.started_at) AND julianday(coalesce(s.closed_at, ?2))
  ORDER BY s.started_at DESC LIMIT 1)`;

/** Tokens (all four kinds) and US$ per project, local day (YYYY-MM-DD) and sprint (none = outside a sprint). */
export function usageByDay(
  db: Db,
  projectId?: string,
  now = Date.now(),
): { projectId: string; date: string; sprintId?: string; tokens: number; usd: number }[] {
  const rows = db
    .prepare(
      `SELECT u.project_id AS projectId, date(u.at, 'localtime') AS date, ${SPRINT_OF_SQL} AS sprintId,
         sum(coalesce(u.tokens_in, 0) + coalesce(u.tokens_out, 0) + coalesce(u.cache_read, 0) + coalesce(u.cache_write, 0)) AS tokens,
         sum(${USD_SQL}) AS usd
       FROM usage u WHERE ?1 IS NULL OR u.project_id = ?1
       GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`,
    )
    .all(projectId ?? null, new Date(now).toISOString());
  return rows.map((r) => ({
    projectId: String(r.projectId),
    date: String(r.date),
    sprintId: r.sprintId == null ? undefined : String(r.sprintId),
    tokens: Number(r.tokens),
    usd: Number(r.usd),
  }));
}
