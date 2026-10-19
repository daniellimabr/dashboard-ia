// Runs the API server and Vite together; when one exits, stops the other with its exit code.
import { spawn } from "node:child_process";

const run = (script: string) => spawn(process.execPath, [script], { stdio: "inherit" });

const kids = [run("server/main.ts"), run("node_modules/vite/bin/vite.js")];
let exiting = false;
const stop = (code: number) => {
  if (exiting) return;
  exiting = true;
  for (const k of kids) if (k.exitCode === null) k.kill();
  process.exitCode = code;
};
for (const k of kids) k.on("exit", (code) => stop(code ?? 1));
process.on("SIGINT", () => stop(130)); // Ctrl+C
