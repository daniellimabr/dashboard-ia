// HTTP API (spec 0001 §4): GET /api/data and POST /api/projects/:id/promote. JSON only.
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

export const handler = (db: Db) => (req: IncomingMessage, res: ServerResponse) => {
  try {
    if (!isLocal(req)) return send(res, 403, { error: "forbidden" });
    const path = (req.url ?? "").split("?")[0];
    if (req.method === "GET" && path === "/api/data") return send(res, 200, buildData(db));
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
