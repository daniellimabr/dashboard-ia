import type { Data } from "../data/types";

/** What happened in a project since Daniel's last command: events (oldest first) and spend. */
export function sinceLastCommand(data: Data, projectId: string) {
  const after = Date.parse(data.lastCommand.at);
  const day = data.lastCommand.at.slice(0, 10);
  const project = data.projects.find((p) => p.id === projectId);
  const events = (project?.events ?? [])
    .filter((e) => Date.parse(e.at) > after)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const days = data.usage.filter((u) => u.projectId === projectId && u.date >= day);
  return {
    events,
    usd: days.reduce((s, u) => s + u.usd, 0),
    tokens: days.reduce((s, u) => s + u.tokens, 0),
  };
}
