// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { openDb } from "./db.ts";
import { importUsage, seedPrices } from "./usage.ts";

it("a broken line or a broken .meta.json does not stop the import", () => {
  const db = openDb(":memory:");
  seedPrices(db);
  const root = mkdtempSync(join(tmpdir(), "tx-"));
  const sub = join(root, "C--x", "c1", "subagents");
  mkdirSync(sub, { recursive: true });
  const ok = (id: string) =>
    `{"type":"assistant","cwd":"C:\\\\x","sessionId":"c1","agentId":"a1","timestamp":"2026-10-18T10:35:00Z","message":{"id":"${id}","model":"claude-haiku-4-5","usage":{"input_tokens":10}}}\n`;
  writeFileSync(join(sub, "agent-a1.jsonl"), `{not json\n"str"\nnull\n${ok("m1")}${ok("m2")}`);
  writeFileSync(join(sub, "agent-a1.meta.json"), "{broken");
  importUsage(db, root, [{ id: "p1", repoPath: "C:/x" }]);
  expect(db.prepare("SELECT count(*) n FROM usage").get()?.n).toBe(2);
  expect(db.prepare("SELECT agent_type FROM usage LIMIT 1").get()?.agent_type).toBeNull();
});
