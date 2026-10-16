import type { UsageDay } from "../data/types";

export interface ProjectUsage {
  projectId: string;
  tokens: number;
  usd: number;
  pct: number; // share of total spend (US$)
}

export function usageByProject(usage: UsageDay[]): ProjectUsage[] {
  const byProject = new Map<string, ProjectUsage>();
  for (const u of usage) {
    const p = byProject.get(u.projectId) ?? { projectId: u.projectId, tokens: 0, usd: 0, pct: 0 };
    p.tokens += u.tokens;
    p.usd += u.usd;
    byProject.set(u.projectId, p);
  }
  const total = usage.reduce((s, u) => s + u.usd, 0);
  return [...byProject.values()].map((p) => ({ ...p, pct: total ? (p.usd / total) * 100 : 0 }));
}

export function dailySeries(usage: UsageDay[], projectId?: string) {
  const byDate = new Map<string, { date: string; tokens: number; usd: number }>();
  for (const u of usage) {
    if (projectId && u.projectId !== projectId) continue;
    const d = byDate.get(u.date) ?? { date: u.date, tokens: 0, usd: 0 };
    d.tokens += u.tokens;
    d.usd += u.usd;
    byDate.set(u.date, d);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
