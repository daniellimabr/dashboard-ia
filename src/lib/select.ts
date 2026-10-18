import type { Data } from "../data/types";

export const activeSprint = (data: Data, projectId: string) =>
  data.sprints.find((s) => s.projectId === projectId && s.status === "active");

export const runningAgents = (data: Data, projectId: string) =>
  data.chats
    .filter((c) => c.projectId === projectId)
    .flatMap((c) => c.agents.filter((a) => !a.endedAt));
