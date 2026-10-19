// Local server: imports events and transcripts every ~2 s and serves the API on 127.0.0.1:5174.
import { createServer } from "node:http";
import { DEFAULT_DB, openDb } from "./db.ts";
import { DEFAULT_EVENTS_DIR } from "./events.ts";
import { importAll } from "./importer.ts";
import { handler } from "./http.ts";
import { DEFAULT_TRANSCRIPTS, seedPrices } from "./usage.ts";

const PORT = 5174;
const eventsDir = process.env.DASHBOARD_EVENTS_DIR || DEFAULT_EVENTS_DIR;
const db = openDb(process.env.DASHBOARD_DB || DEFAULT_DB);
seedPrices(db);

function importRound() {
  try {
    importAll(db, eventsDir, DEFAULT_TRANSCRIPTS);
  } catch (e) {
    console.error("import failed:", e);
  }
}

importRound();
setInterval(importRound, 2000);
createServer(handler(db)).listen(PORT, "127.0.0.1", () => {
  console.log(`API em http://127.0.0.1:${PORT}/api/data · eventos de ${eventsDir}`);
});
