// @vitest-environment node
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./db.ts";
import { handler } from "./http.ts";

let db: Db;
let server: Server;
let base: string;

beforeEach(async () => {
  db = openDb(":memory:");
  db.exec(
    "INSERT INTO project (id, name, last_activity_at) VALUES ('p1', 'P', '2026-10-18T10:00:00Z')",
  );
  server = createServer(handler(db));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(() => new Promise((r) => server.close(r)));

describe("http handler", () => {
  it("serves Data on GET /api/data", async () => {
    const res = await fetch(`${base}/api/data`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect((await res.json()).projects[0].name).toBe("P");
  });

  it("reports when the server started and when the repo's last commit happened", async () => {
    await new Promise((r) => server.close(r));
    server = createServer(handler(db, 1000, () => 2000));
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    expect((await (await fetch(`${base}/api/data`)).json()).server).toEqual({
      startedAt: 1000,
      commitAt: 2000,
    });
  });

  it("promotes a project and 404s an unknown one", async () => {
    expect((await fetch(`${base}/api/projects/p1/promote`, { method: "POST" })).status).toBe(204);
    expect(db.prepare("SELECT promoted FROM project").get()).toEqual({ promoted: 1 });
    const res = await fetch(`${base}/api/projects/nope/promote`, { method: "POST" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "project not found" });
  });

  it("returns JSON errors for unknown routes and failures", async () => {
    expect((await fetch(`${base}/api/nothing`)).status).toBe(404);
    db.close();
    const res = await fetch(`${base}/api/data`);
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty("error");
  });

  it("rejects requests from other sites (Origin) and other host names (DNS rebinding)", async () => {
    const evil = await fetch(`${base}/api/projects/p1/promote`, {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(evil.status).toBe(403);
    expect(db.prepare("SELECT promoted FROM project").get()).toEqual({ promoted: 0 });
    expect(
      (await fetch(`${base}/api/data`, { headers: { origin: "http://localhost:5173" } })).status,
    ).toBe(200);
  });
});
