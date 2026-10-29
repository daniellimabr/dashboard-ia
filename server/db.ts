// SQLite access lives only here (node:sqlite is still experimental; see ADR 0001).
import { closeSync, fstatSync, mkdirSync, openSync, readSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Db = DatabaseSync;

export const DEFAULT_DB = join(homedir(), ".dashboard-ia", "dashboard.db");

// Bump when the schema changes: tables are rebuilt keeping their rows (see migrate).
const VERSION = 9; // 9: sprint.started_at from the first sprint.open; 8: task.model; 6: usage.agent_type and the transcripts' turns (waits); 7: one Reviewer agent name

// Spec 0001 §3, fed by the harness events (contract v1).
const SCHEMA = `
CREATE TABLE IF NOT EXISTS project (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, repo_path TEXT,
  last_activity_at TEXT NOT NULL,
  backlog TEXT, roadmap TEXT,
  where_stopped TEXT, next_step_json TEXT, phase_json TEXT, alerts_json TEXT,
  promoted INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sprint (
  project_id TEXT NOT NULL, id TEXT NOT NULL,
  title TEXT NOT NULL, goal TEXT, status TEXT NOT NULL,
  planned_at TEXT, approved_at TEXT, started_at TEXT, delivered_at TEXT, closed_at TEXT,
  planned_min INTEGER, usd_estimate REAL, feedback_rounds INTEGER NOT NULL DEFAULT 0,
  plan_path TEXT, task_count INTEGER,
  PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS task (
  project_id TEXT NOT NULL, sprint_id TEXT,
  scope TEXT NOT NULL,
  chat_id TEXT, id TEXT NOT NULL, title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0, steps INTEGER NOT NULL DEFAULT 0,
  review TEXT, review_round INTEGER NOT NULL DEFAULT 0,
  agent_kind TEXT, wave INTEGER, plan_start INTEGER, plan_duration INTEGER, plan_deps TEXT,
  started_at TEXT, ended_at TEXT, model TEXT,
  PRIMARY KEY (project_id, scope, id)
);
CREATE TABLE IF NOT EXISTS chat (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
  sprint_id TEXT, started_at TEXT NOT NULL, ended_at TEXT
);
CREATE TABLE IF NOT EXISTS agent (
  id TEXT PRIMARY KEY, chat_id TEXT NOT NULL,
  kind TEXT NOT NULL, name TEXT NOT NULL, task_id TEXT, doing TEXT,
  context_pct INTEGER, started_at TEXT NOT NULL, ended_at TEXT
);
CREATE TABLE IF NOT EXISTS usage (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL, chat_id TEXT, agent_id TEXT, at TEXT NOT NULL, model TEXT NOT NULL,
  tokens_in INTEGER, tokens_out INTEGER, cache_read INTEGER, cache_write INTEGER,
  agent_type TEXT -- subagent's agentType (its .meta.json), the harness' agent name
);
-- Main-session transcript lines: kind = 'assistant', 'limit' (usage limit hit) or 'human'.
CREATE TABLE IF NOT EXISTS turn (chat_id TEXT NOT NULL, at TEXT NOT NULL, kind TEXT NOT NULL,
  PRIMARY KEY (chat_id, at, kind));
CREATE TABLE IF NOT EXISTS price (model TEXT PRIMARY KEY, in_per_mtok REAL, out_per_mtok REAL,
  cache_read_per_mtok REAL, cache_write_per_mtok REAL);
CREATE TABLE IF NOT EXISTS doc (
  project_id TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL,
  path TEXT NOT NULL, date TEXT, markdown TEXT, PRIMARY KEY (project_id, id)
);
CREATE TABLE IF NOT EXISTS event (
  rowid INTEGER PRIMARY KEY, project_id TEXT NOT NULL, at TEXT NOT NULL, type TEXT NOT NULL,
  chat_id TEXT, body TEXT NOT NULL, hash TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS limit_window (window TEXT PRIMARY KEY, pct INTEGER, resets_at TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS import_cursor (file TEXT PRIMARY KEY, offset INTEGER NOT NULL, head TEXT);
CREATE TABLE IF NOT EXISTS import_error (file TEXT, offset INTEGER, line TEXT, error TEXT, at TEXT);
-- Lines of an unknown contract version: ignored, only counted.
CREATE TABLE IF NOT EXISTS import_skip (file TEXT NOT NULL, offset INTEGER NOT NULL, PRIMARY KEY (file, offset));

CREATE INDEX IF NOT EXISTS event_project_at ON event(project_id, at);
CREATE INDEX IF NOT EXISTS usage_project_at ON usage(project_id, at);
CREATE INDEX IF NOT EXISTS agent_open ON agent(chat_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS chat_project ON chat(project_id, started_at);
CREATE INDEX IF NOT EXISTS task_sprint ON task(project_id, sprint_id);
`;

/** SQL identifier; names come from the database itself. */
const q = (name: unknown) => `"${String(name).replaceAll('"', '""')}"`;
const names = (db: Db, sql: string, ...args: string[]) =>
  db
    .prepare(sql)
    .all(...args)
    .map((r) => String(r.name));
const columns = (db: Db, table: string) =>
  names(db, "SELECT name FROM pragma_table_info(?)", table);

/**
 * Rebuilds every table from SCHEMA and copies the old rows back (columns in common), since the
 * transcripts they came from may be gone; tables no longer in SCHEMA are dropped. Caller holds the transaction.
 */
function migrate(db: Db) {
  // Old indexes would block the new ones (same names, IF NOT EXISTS).
  for (const i of names(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL",
  ))
    db.exec(`DROP INDEX ${q(i)}`);
  const tables = names(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  for (const t of tables) db.exec(`ALTER TABLE ${q(t)} RENAME TO ${q(`_old_${t}`)}`);
  db.exec(SCHEMA);
  const kept = new Set(names(db, "SELECT name FROM sqlite_master WHERE type = 'table'"));
  for (const t of tables) {
    const old = `_old_${t}`;
    if (kept.has(t)) {
      const now = new Set(columns(db, t));
      const cols = columns(db, old)
        .filter((c) => now.has(c))
        .map(q)
        .join(", ");
      if (cols) db.exec(`INSERT INTO ${q(t)} (${cols}) SELECT ${cols} FROM ${q(old)}`);
    }
    db.exec(`DROP TABLE ${q(old)}`);
  }
  // 9: the sprint start is the FIRST sprint.open; older rows kept the last (reapproved plans)
  db.exec(`UPDATE sprint SET started_at = (SELECT min(e.at) FROM event e
    WHERE e.type = 'sprint.open' AND e.project_id = sprint.project_id
      AND json_extract(e.body, '$.sprint') = sprint.id)
    WHERE EXISTS (SELECT 1 FROM event e WHERE e.type = 'sprint.open'
      AND e.project_id = sprint.project_id AND json_extract(e.body, '$.sprint') = sprint.id)`);
  db.exec(`PRAGMA user_version = ${VERSION}`);
}

/** Opens (and creates) the database; pass ":memory:" in tests. */
export function openDb(file = DEFAULT_DB): Db {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  const version = () =>
    (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  if (version() < VERSION) {
    // One transaction: a second process (or a crash) never sees half-dropped tables. IMMEDIATE waits for the other writer, then re-checks.
    db.exec("PRAGMA busy_timeout = 10000");
    db.exec("BEGIN IMMEDIATE");
    try {
      if (version() < VERSION) migrate(db);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  db.exec(SCHEMA);
  return db;
}

const NL = 10;
const HEAD = 256;

/** Hex of the file's first bytes, up to `upTo` (the imported part), to notice a rewrite. */
function headOf(fd: number, upTo: number) {
  const buf = Buffer.alloc(Math.min(HEAD, upTo));
  readSync(fd, buf, 0, buf.length, 0);
  return buf.toString("hex");
}

/**
 * Feeds each complete line appended to `file` since the last call to `handle`, in one transaction,
 * and advances the cursor in `import_cursor`. A line whose handler throws goes to `import_error`;
 * one it returns "skip" for goes to `import_skip`.
 * A partial last line (no trailing \n) waits for the next call. Returns the number of lines read.
 */
export function importLines(db: Db, file: string, handle: (line: string) => unknown): number {
  const row = db.prepare("SELECT offset, head FROM import_cursor WHERE file = ?").get(file);
  const fd = openSync(file, "r");
  try {
    const size = fstatSync(fd).size;
    const saved = Number(row?.offset ?? 0);
    // Rewritten file (shrank, or its first imported bytes changed): read again; event hashes skip repeats.
    const start = saved > size || headOf(fd, saved) !== (row?.head ?? "") ? 0 : saved;
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    const end = buf.lastIndexOf(NL);
    if (end < 0) return 0;
    const logError = db.prepare(
      "INSERT INTO import_error (file, offset, line, error, at) VALUES (?, ?, ?, ?, ?)",
    );
    let count = 0;
    db.exec("BEGIN");
    try {
      for (let pos = 0; pos <= end;) {
        const nl = buf.indexOf(NL, pos);
        const line = buf.toString("utf8", pos, nl).trim();
        if (line) {
          count++;
          try {
            if (handle(line) === "skip")
              db.prepare("INSERT OR IGNORE INTO import_skip VALUES (?, ?)").run(file, start + pos);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logError.run(file, start + pos, line.slice(0, 2000), msg, new Date().toISOString());
          }
        }
        pos = nl + 1;
      }
      db.prepare(
        "INSERT INTO import_cursor (file, offset, head) VALUES (?, ?, ?) ON CONFLICT(file) DO UPDATE SET offset = excluded.offset, head = excluded.head",
      ).run(file, start + end + 1, headOf(fd, start + end + 1));
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return count;
  } finally {
    closeSync(fd);
  }
}
