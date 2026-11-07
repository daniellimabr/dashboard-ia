// Shapes mirror the future harness events (see docs/adr/0001-arquitetura.md).
export type AgentKind = "tech-lead" | "clone" | "reviewer";

/** Tokens by kind; their sum is the total of tokens. */
export interface TokenKinds {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** Consumption of a sprint, task or agent: tokens by kind, US$ and share of the 5 h window and of the week (0–100+, uncapped). */
export interface Consumption extends TokenKinds {
  usd: number;
  pct5h: number; // usd / Data.limits.h5Usd * 100
  pctWeek: number;
}

export interface Agent {
  consumption?: Consumption; // missing = no usage read
  id: string;
  kind: AgentKind;
  name: string; // "Tech Lead", "Clone 1", "Reviewer"
  task?: string; // task id it works on, e.g. "T03"
  doing?: string; // short text, e.g. "coordena a onda 2"
  startedAt: string;
  endedAt?: string; // missing = running now
  usd?: number; // from the transcripts; missing = "sem dado"
  tokens?: number;
}

/** Task steps in order; `steps` counts how many are done. */
export const STEPS = ["Teste", "Código", "Lint", "Revisão", "Commit"] as const;

export interface TaskPlan {
  start: number; // minutes after sprint start
  duration: number; // planned minutes
  deps: string[];
}

export interface Task {
  consumption?: Consumption; // its agent's usage, or the usage in its start-end window
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
  agentId?: string; // Agent.id that worked on it, when the events say
  model?: string; // model that ran it, from the task.* / worker.* events
  plannedModel?: string; // model the sprint plan asked for
}

/** A pause of the sprint chat: waiting for Daniel's reply, or stopped by a usage limit. */
export interface Wait {
  kind: "reply" | "limit";
  start: string; // ISO
  end: string;
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

export interface ModelUsage {
  model: string;
  input: number;
  output: number;
  cache: number; // cache read + write
  usd: number;
  external?: true; // not Claude (Gemini): usd is 0
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
  consumption?: Consumption; // usage in the sprint window; missing = none
  byModel?: ModelUsage[]; // missing = no consumption in the sprint window
  waits?: Wait[]; // missing = "sem dado"; [] = no waits
  tasks: Task[];
}

export interface UsageDay {
  projectId: string;
  date: string; // YYYY-MM-DD
  sprintId?: string; // missing = outside a sprint; one row per project, day and sprint
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
  promoted?: boolean; // "Trazer para ativos", persisted by the server
}

export interface Limit {
  pct: number;
  resetsAt?: string; // missing when estimated
  estimated?: boolean; // pct = last reading + the spend since it (or since the reset); no reading: the window's spend
}

export interface Data {
  server?: { startedAt: number; commitAt?: number }; // epoch ms; commitAt missing = git unavailable
  lastCommand: { at: string; chatId: string };
  limits: { h5: Limit; week?: Limit; h5Usd: number }; // h5Usd: spend that equals 100% of the 5 h window; week missing = "sem dado"
  projects: Project[];
  chats: Chat[];
  sprints: Sprint[];
  usage: UsageDay[];
  docs: Doc[];
}
