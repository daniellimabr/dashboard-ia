import { useState } from "react";
import { Markdown } from "../components/Markdown";
import { Panel, Pill, Tabs } from "../components/ui";
import u from "../components/ui.module.css";
import type { Tone } from "../data/types";
import { parseBacklog, type BacklogItem, type BacklogStatus } from "../lib/docsParse";
import { useProject } from "../lib/useProject";
import s from "./Backlog.module.css";

type Filter = BacklogStatus | "all";
const LABEL: Record<BacklogStatus, [string, Tone | undefined]> = {
  open: ["aberto", undefined],
  planned: ["planejado", "run"],
  done: ["concluído", "ok"],
};

const situation = (i: BacklogItem) => {
  const [text, tone] = LABEL[i.status];
  return <Pill tone={tone}>{i.sprint ? `${text} ${i.sprint}` : text}</Pill>;
};

export function Backlog() {
  const { backlog } = useProject();
  const [filter, setFilter] = useState<Filter>("all");
  const items = parseBacklog(backlog);
  const count = (st: BacklogStatus) => items.filter((i) => i.status === st).length;
  const shown = items.filter((i) => filter === "all" || i.status === filter);

  if (!items.length)
    return (
      <Panel title="Backlog" wide>
        <div className={s.md}>
          <Markdown source={backlog} />
        </div>
      </Panel>
    );

  return (
    <Panel
      title="Backlog"
      wide
      aside={
        <Tabs
          label="Situação"
          value={filter}
          onChange={setFilter}
          items={[
            ["all", `Todos (${items.length})`],
            ["open", `Abertos (${count("open")})`],
            ["planned", `Planejados (${count("planned")})`],
            ["done", `Concluídos (${count("done")})`],
          ]}
        />
      }
    >
      <div className={u.scrollX}>
        <table className={u.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Situação</th>
              <th>Prioridade</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i, n) => (
              <tr key={`${n}-${i.text}`}>
                <td>
                  {i.text}
                  {i.sub.length > 0 && (
                    <ul className={`${u.muted} ${s.sub}`}>
                      {i.sub.map((x) => (
                        <li key={x}>{x.replace(/\*\*/g, "")}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>{situation(i)}</td>
                <td>{i.priority}</td>
                <td>{i.date ?? "sem dado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
