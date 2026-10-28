import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { openDb } from "./db.ts";

it("rebuilds a half-migrated database (old version, no project table)", () => {
  const file = join(mkdtempSync(join(tmpdir(), "dash-")), "d.db");
  const old = new DatabaseSync(file);
  old.exec("CREATE TABLE task (id TEXT); PRAGMA user_version = 7");
  old.close();
  const db = openDb(file);
  expect(db.prepare("SELECT count(*) AS n FROM project").get()).toEqual({ n: 0 });
});
