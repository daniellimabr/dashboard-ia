// HTTP API (spec 0001 §4): GET /api/data and POST /api/projects/:id/promote. JSON only.
import { execFileSync } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildData } from "./data.ts";
import type { Db } from "./db.ts";

const LOCAL = new Set(["localhost", "127.0.0.1"]);

/** Only this machine's pages: blocks other sites (Origin) and DNS rebinding (Host). */
function isLocal(req: IncomingMessage) {
  const host = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  };
  const origin = req.headers.origin;
  return (
    LOCAL.has(host(`http://${req.headers.host ?? ""}`)) && (!origin || LOCAL.has(host(origin)))
  );
}

function send(res: ServerResponse, status: number, body?: unknown) {
  if (body === undefined) return res.writeHead(status).end();
  res
    .writeHead(status, { "content-type": "application/json; charset=utf-8" })
    .end(JSON.stringify(body));
}

/** Epoch ms of the repo's last commit (cwd), or undefined when git is missing or fails. */
let cached: { at: number; value: number | undefined } | undefined;
function lastCommitAt(): number | undefined {
  if (cached && Date.now() - cached.at < 5000) return cached.value;
  const value = readCommitAt();
  cached = { at: Date.now(), value };
  return value;
}

function readCommitAt(): number | undefined {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct"], {
      timeout: 2000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const secs = Number.parseInt(out, 10);
    return Number.isFinite(secs) ? secs * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export const handler =
  (db: Db, startedAt = Date.now(), commitAt = lastCommitAt) =>
  (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (!isLocal(req)) return send(res, 403, { error: "forbidden" });
      const path = (req.url ?? "").split("?")[0];
      if (req.method === "GET" && path === "/api/data")
        return send(res, 200, { ...buildData(db), server: { startedAt, commitAt: commitAt() } });
      const promote = /^\/api\/projects\/([^/]+)\/promote$/.exec(path ?? "");
      if (req.method === "POST" && promote) {
        const id = decodeURIComponent(promote[1] ?? "");
        const { changes } = db.prepare("UPDATE project SET promoted = 1 WHERE id = ?").run(id);
        return changes ? send(res, 204) : send(res, 404, { error: "project not found" });
      }
      send(res, 404, { error: "not found" });
    } catch (e) {
      if (e instanceof URIError) return send(res, 400, { error: "bad url" });
      send(res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
  };
