import { useState } from "react";
import { Link } from "react-router";
import { ProgressRow } from "../components/ProgressRow";
import type { Doc, Sprint } from "../data/types";
import { useData } from "../lib/useData";
import { useProject } from "../lib/useProject";
import s from "./Plan.module.css";

const STATUSES = ["Backlog", "Planejado", "Concluído"] as const;
type Status = (typeof STATUSES)[number];
const MARK: Record<string, Status> = { planejado: "Planejado", concluído: "Concluído" };
const TONE: Record<Status, string> = { Backlog: "", Planejado: "p-run", Concluído: "p-ok" };

export interface BacklogItem {
  priority: string;
  date?: string;
  status: Status;
  sprint?: string;
  text: string;
  sub: string[];
}

// `- [prioridade] data [status: SNN] — texto`; also the old `- **[prioridade]** texto`.
const ITEM =
  /^- \*{0,2}\[([^\]:]+)\]\*{0,2}\s+(?:(\d{4}-\d{2}-\d{2})\s+)?(?:\[(planejado|concluído): (S\d+)\]\s+)?(?:— )?(.*)$/;

/** Items of docs/backlog.md; indented `- ` lines below an item are its subitems. */
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
        status: m[3] ? (MARK[m[3]] ?? "Backlog") : "Backlog",
        sprint: m[4],
        text: m[5] ?? "",
        sub: [],
      };
      items.push(last);
    } else if (sub && last) last.sub.push(sub[1] ?? "");
    else if (line.trim()) last = undefined;
  }
  return items;
}

const STAGES = ["Feito", "Agora", "Próximo", "Depois"];
const rank = (name: string) => (STAGES.indexOf(name) + 5) % 5; // unknown sections last

/** `## ` sections of docs/roadmap.md, in timeline order, with the sprints each one cites. */
export function parseRoadmap(md: string) {
  const stages = md
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const [name = "", ...lines] = block.split("\n");
      const items = lines.filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
      const sprints = items.flatMap((i) =>
        [...i.matchAll(/S(\d+)(?:[–-]S(\d+))?/g)].flatMap(([, a = "", b = a]) =>
          Array.from(
            { length: Number(b) - Number(a) + 1 },
            (_, k) => `S${String(Number(a) + k).padStart(a.length, "0")}`,
          ),
        ),
      );
      return { name: name.trim(), items, sprints: [...new Set(sprints)] };
    });
  return stages.sort((a, b) => rank(a.name) - rank(b.name));
}

/** Release Report when the sprint is 100% done, else its plan. */
export function sprintDoc(id: string, sprints: Sprint[], docs: Doc[]) {
  const sprint = sprints.find((x) => x.id === id);
  const find = (kind: Doc["kind"]) =>
    docs.find((d) => d.kind === kind && (d.id.split("/").pop() ?? "").startsWith(`${id}-`));
  const done = !!sprint?.tasks.length && sprint.tasks.every((t) => t.done);
  return (done && find("release-report")) || find("sprint-plan");
}

export function Plan() {
  const project = useProject();
  const { data } = useData();
  const [filter, setFilter] = useState<Status | "">("");
  const items = parseBacklog(project.backlog).filter((i) => !filter || i.status === filter);
  const sprints = data.sprints.filter((x) => x.projectId === project.id);
  const docs = data.docs.filter((d) => d.projectId === project.id);
  const pill = (st: Status) => <span className={`pill ${TONE[st]}`}>{st}</span>;

  return (
    <>
      <section className="card">
        <header className={s.head}>
          <h2>Backlog</h2>
          <label>
            Status{" "}
            <select value={filter} onChange={(e) => setFilter(e.target.value as Status | "")}>
              <option value="">Todos</option>
              {STATUSES.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </label>
        </header>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Prioridade</th>
              <th>Data</th>
              <th>Status</th>
              <th>Sprint</th>
              <th>Item</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.text}>
                <td>{i.priority}</td>
                <td className="num">{i.date ?? "—"}</td>
                <td>{pill(i.status)}</td>
                <td>{i.sprint ? <span className="chip">{i.sprint}</span> : "—"}</td>
                <td>
                  {i.text}
                  {i.sub.length > 0 && (
                    <ul className="muted">
                      {i.sub.map((x) => (
                        <li key={x}>{x.replace(/\*\*/g, "")}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="grid" aria-label="Kanban">
        {STATUSES.filter((st) => !filter || st === filter).map((st) => {
          const col = items.filter((i) => i.status === st);
          return (
            <section key={st} className="card">
              <h3>
                {st} <span className="muted num">({col.length})</span>
              </h3>
              {col.map((i) => (
                <ProgressRow
                  key={i.text}
                  level={2}
                  title={i.text}
                  sub={i.priority}
                  chips={i.sprint && <span className="chip">{i.sprint}</span>}
                />
              ))}
            </section>
          );
        })}
      </section>
      <section className="card">
        <h2>Roadmap</h2>
        <ol className={s.timeline}>
          {parseRoadmap(project.roadmap).map((st, n) => (
            <li key={st.name}>
              <ProgressRow
                title={`${n + 1}. ${st.name}`}
                sub={st.sprints.join(" · ")}
                chips={st.name === "Agora" && <span className="chip run">atual</span>}
              >
                <ul>
                  {st.sprints.map((id) => {
                    const doc = sprintDoc(id, sprints, docs);
                    const title = sprints.find((x) => x.id === id)?.title;
                    const label = title ? `${id} — ${title}` : id;
                    return (
                      <li key={id}>
                        {doc ? (
                          <Link to={`/p/${project.id}/docs/${encodeURIComponent(doc.id)}`}>
                            {label}
                          </Link>
                        ) : (
                          label
                        )}
                      </li>
                    );
                  })}
                </ul>
                <ul className="muted">
                  {st.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </ProgressRow>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
