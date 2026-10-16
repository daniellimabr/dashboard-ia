// Shapes mirror the future harness events (see docs/adr/0001-arquitetura.md).
export type AgentKind = "tech-lead" | "clone" | "reviewer";

export interface Agent {
  id: string;
  kind: AgentKind;
  name: string;
  task?: string;
  startedAt: string;
  endedAt?: string; // missing = running now
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  startedAt?: string;
  endedAt?: string;
  review?: "pass" | "fail";
}

export interface Chat {
  id: string;
  projectId: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  sprintId?: string;
  agents: Agent[];
  tasks: Task[];
}

export interface Sprint {
  id: string;
  projectId: string;
  title: string;
  status: "planned" | "active" | "closed";
  startedAt?: string;
  closedAt?: string;
  tasks: Task[];
}

export interface UsageDay {
  projectId: string;
  date: string; // YYYY-MM-DD
  tokens: number;
  usd: number;
}

export interface Doc {
  id: string;
  projectId: string;
  kind: "sprint-plan" | "release-report" | "adr" | "prd";
  title: string;
  markdown: string;
}

export interface Project {
  id: string;
  name: string;
  backlog: string; // markdown
  roadmap: string; // markdown
}

export interface Data {
  projects: Project[];
  chats: Chat[];
  sprints: Sprint[];
  usage: UsageDay[];
  docs: Doc[];
}
