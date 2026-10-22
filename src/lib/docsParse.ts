import type { Doc, Sprint } from "../data/types";

export type BacklogStatus = "open" | "planned" | "done";
const MARK: Record<string, BacklogStatus> = { planejado: "planned", concluído: "done" };
const ORDER: BacklogStatus[] = ["open", "planned", "done"];

export interface BacklogItem {
  priority: string;
  date?: string;
  status: BacklogStatus;
  sprint?: string;
  text: string;
  sub: string[];
}

// `- [prioridade] data [status: SNN] — texto`; also the old `- **[prioridade]** texto`.
const ITEM =
  /^- \*{0,2}\[([^\]:]+)\]\*{0,2}\s+(?:(\d{4}-\d{2}-\d{2})\s+)?(?:\[(planejado|concluído): (S\d+)\]\s+)?(?:— )?(.*)$/;

/** Items of docs/backlog.md, open first; indented `- ` lines below an item are its subitems. */
export function parseBacklog(md: string): BacklogItem[] {
  const items: BacklogItem[] = [];
  let last: BacklogItem | undefined;
  for (const line of md.split("\n")) {
    const m = ITEM.exec(line);
    const sub = /^\s+- (.*)$/.exec(line);
    if (m) {
      last = {
        priority: m[1] ?? "",
        date: m[2],
        status: m[3] ? (MARK[m[3]] ?? "open") : "open",
        sprint: m[4],
        text: m[5] ?? "",
        sub: [],
      };
      items.push(last);
    } else if (sub && last) last.sub.push(sub[1] ?? "");
    else if (line.trim()) last = undefined;
  }
  return items.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
}

export const STAGES = ["Agora", "Próximo", "Depois", "Feito"] as const;

/** `SNN` and `SNN–SNN` ranges cited in a line. */
const citedSprints = (text: string) => [
  ...new Set(
    [...text.matchAll(/S(\d+)(?:[–-]S(\d+))?/g)].flatMap(([, a = "", b = a]) =>
      Array.from(
        { length: Math.max(0, Number(b) - Number(a) + 1) },
        (_, k) => `S${String(Number(a) + k).padStart(a.length, "0")}`,
      ),
    ),
  ),
];

/** The four `## ` columns of docs/roadmap.md (missing ones empty); null when none is there. */
export function parseRoadmap(md: string) {
  const blocks = new Map(
    md
      .split(/^## /m)
      .slice(1)
      .map((block) => {
        const [name = "", ...lines] = block.split("\n");
        return [name.trim(), lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2))];
      }),
  );
  if (!STAGES.some((n) => blocks.has(n))) return null;
  return STAGES.map((name) => ({
    name,
    items: (blocks.get(name) ?? []).map((text) => ({ text, sprints: citedSprints(text) })),
  }));
}

/** Release Report when the sprint is 100% done, else its plan. */
export function sprintDoc(id: string, sprints: Sprint[], docs: Doc[]) {
  const sprint = sprints.find((x) => x.id === id);
  const find = (kind: Doc["kind"]) =>
    docs.find((d) => d.kind === kind && (d.id.split("/").pop() ?? "").startsWith(`${id}-`));
  const done = !!sprint?.tasks.length && sprint.tasks.every((t) => t.done);
  return (done && find("release-report")) || find("sprint-plan");
}
