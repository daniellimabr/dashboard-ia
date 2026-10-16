import type { Task } from "../data/types";
import { durationMs, formatDuration, formatTime } from "../lib/time";
import { useNow } from "../lib/useNow";
import css from "./TaskList.module.css";

export function TaskList({ tasks, now }: { tasks: Task[]; now?: number }) {
  const tick = useNow();
  const t = now ?? tick;
  if (!tasks.length) return <p className="muted">Nenhuma tarefa.</p>;
  return (
    <ul className={css.list}>
      {tasks.map((task) => (
        <li key={task.id} className={css.row}>
          <label className={css.title}>
            <input type="checkbox" checked={task.done} readOnly />
            <span className={css.id}>{task.id}</span>
            <span>{task.title}</span>
          </label>
          <div className={css.meta}>
            {!task.done && task.startedAt && <span className="badge badge-live">em andamento</span>}
            {task.review && (
              <span className={`badge ${task.review === "pass" ? "badge-ok" : "badge-bad"}`}>
                revisão {task.review === "pass" ? "aprovada" : "reprovada"}
              </span>
            )}
            <span>Início {task.startedAt ? <time>{formatTime(task.startedAt)}</time> : "—"}</span>
            <span>Fim {task.endedAt ? <time>{formatTime(task.endedAt)}</time> : "—"}</span>
            <span>
              Duração{" "}
              <strong>
                {task.startedAt ? formatDuration(durationMs(task.startedAt, task.endedAt, t)) : "—"}
              </strong>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
