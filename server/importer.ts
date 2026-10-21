// One import round: projects.json, events, then transcripts of the registered repos.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Db } from "./db.ts";
import { importEvents } from "./events.ts";
import { importUsage } from "./usage.ts";

const repos = (db: Db) =>
  db
    .prepare("SELECT id, repo_path repoPath FROM project WHERE repo_path IS NOT NULL ORDER BY id")
    .all() as {
    id: string;
    repoPath: string;
  }[];

/** Registers the attached projects from `<harness home>/projects.json`; a broken file is reported and skipped. */
function importProjects(db: Db, file: string) {
  if (!existsSync(file)) return;
  let list: unknown;
  try {
    list = (JSON.parse(readFileSync(file, "utf8")) as { projects?: unknown }).projects;
  } catch (e) {
    console.error(`projects.json ignored: ${String(e)}`);
    return;
  }
  if (!Array.isArray(list)) return;
  const upsert = db.prepare(
    `INSERT INTO project (id, name, repo_path, last_activity_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, repo_path = excluded.repo_path`,
  );
  for (const p of list as Record<string, unknown>[]) {
    const { id, name, path, attachedAt } = p;
    if (typeof id !== "string" || typeof path !== "string") continue;
    upsert.run(id, typeof name === "string" ? name : id, path, String(attachedAt ?? ""));
  }
}

/** `eventsDir` is `<harness home>/events`; projects.json sits next to it. */
export function importAll(db: Db, eventsDir: string, transcripts: string) {
  const before = JSON.stringify(repos(db));
  importProjects(db, join(dirname(eventsDir), "projects.json"));
  importEvents(db, eventsDir);
  const projects = repos(db);
  // A new or moved repo: transcript lines skipped before it was known must be read again (upsert by message id).
  if (JSON.stringify(projects) !== before)
    db.prepare("DELETE FROM import_cursor WHERE substr(file, 1, length(?)) = ?").run(
      transcripts,
      transcripts,
    );
  importUsage(db, transcripts, projects);
}
