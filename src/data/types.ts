// Shapes mirror the future harness events (see docs/adr/0001-arquitetura.md).
export type AgentKind = "tech-lead" | "clone" | "reviewer";

export interface Agent {
  id: string;
  kind: AgentKind;
  name: string; // "Tech Lead", "Clone 1", "Reviewer"
  task?: string; // task id it works on, e.g. "T03"
  doing?: string; // short text, e.g. "coordena a onda 2"
  contextPct?: number;
  startedAt: string;
  endedAt?: string; // missing = running now
}

/** Task steps in order; `steps` counts how many are done. */
export const STEPS = ["Teste", "Código", "Lint", "Revisão", "Commit"] as const;

export interface TaskPlan {
  start: number; // minutes after sprint start
  duration: number; // planned minutes
  deps: string[];
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  startedAt?: string;
  endedAt?: string;
  review?: "pass" | "fail"; // "fail" on a task not done = rejected, back to fix
  agent?: AgentKind;
  steps?: number; // steps done (0–5) while not done
  plan?: TaskPlan;
  wave?: number; // 1-based
}

export interface Chat {
  id: string;
  projectId: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  sprintId?: string; // missing = chat without sprint ("fora da sprint")
  agents: Agent[];
  tasks: Task[];
}

export interface Sprint {
  id: string;
  projectId: string;
  title: string;
  goal?: string;
  status: "planned" | "active" | "closed";
  approvedAt?: string;
  startedAt?: string;
  deliveredAt?: string; // all tasks done, waiting for Daniel's test
  closedAt?: string;
  plannedMin?: number;
  usd?: number;
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
  kind: "sprint-plan" | "release-report" | "adr" | "prd" | "handoff";
  title: string;
  date?: string;
  markdown: string;
}

export type Tone = "ok" | "bad" | "warn" | "run";

export interface ProjectEvent {
  at: string;
  kind: Tone;
  text: string;
}

export interface Project {
  id: string;
  name: string;
  backlog: string; // markdown
  roadmap: string; // markdown
  lastActivityAt: string;
  phase?: { label: string; tone: Tone; live?: boolean };
  nextStep?: { title: string; detail: string; action: string };
  whereStopped?: string;
  alerts?: { tone: "bad" | "warn"; title: string; detail: string }[];
  events?: ProjectEvent[];
}

export interface Limit {
  pct: number;
  resetsAt: string;
}

export interface Data {
  lastCommand: { at: string; chatId: string };
  limits: { h5: Limit; week: Limit; h5Usd: number }; // h5Usd: spend that equals 100% of the 5 h window
  projects: Project[];
  chats: Chat[];
  sprints: Sprint[];
  usage: UsageDay[];
  docs: Doc[];
}
