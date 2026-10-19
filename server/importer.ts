// One import round: events first, then transcripts of the registered repos.
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

export function importAll(db: Db, eventsDir: string, transcripts: string) {
  const before = JSON.stringify(repos(db));
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
