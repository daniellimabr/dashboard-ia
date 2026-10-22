import { Link, useParams } from "react-router";
import { TaskList } from "../components/TaskList";
import type { Chat } from "../data/types";
import { durationMs, formatDate, formatDuration, formatTime } from "../lib/time";
import { useNow } from "../lib/useNow";
import { useProject } from "../lib/useProject";
import { useData } from "../lib/useData";
import css from "./Chats.module.css";

const when = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

// Chat has no "last interaction" field: latest end among chat, agents and tasks; undefined = still open (sorts first).
function lastAt(c: Chat) {
  if (!c.endedAt || c.agents.some((a) => !a.endedAt)) return undefined;
  return [...c.agents.map((a) => a.endedAt), ...c.tasks.map((t) => t.endedAt)].reduce<string>(
    (max, x) => (x && x > max ? x : max),
    c.endedAt,
  );
}

function Status({ end, live }: { end?: string; live: string }) {
  return end ? (
    <span className="badge">encerrado</span>
  ) : (
    <span className="badge badge-live">{live}</span>
  );
}

export function Chats() {
  const { data } = useData();
  const project = useProject();
  const { chatId } = useParams();
  const now = useNow();
  const chats = data.chats.filter((c) => c.projectId === project.id);

  if (!chatId) {
    const rows = chats
      .map((c) => ({ ...c, last: lastAt(c) }))
      .sort(
        (x, y) =>
          Number(!y.last) - Number(!x.last) ||
          (y.last ?? y.startedAt).localeCompare(x.last ?? x.startedAt),
      );
    return (
      <>
        <h2>Chats</h2>
        {!rows.length ? (
          <p className={`card muted ${css.empty}`}>Nenhum chat neste projeto ainda.</p>
        ) : (
          <table className={css.table}>
            <thead>
              <tr>
                <th>Chat</th>
                <th>Início</th>
                <th>Última interação</th>
                <th>Sprint</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const running = c.agents.filter((a) => !a.endedAt).length;
                return (
                  <tr key={c.id} className={c.last ? undefined : css.open}>
                    <td>
                      <Link to={c.id} className={css.title}>
                        {c.title}
                      </Link>{" "}
                      <Status end={c.endedAt} live="em andamento" />
                      {running > 0 && (
                        <div className="muted">{`${running} ${running > 1 ? "agentes rodando" : "agente rodando"}`}</div>
                      )}
                    </td>
                    <td className="num">{when(c.startedAt)}</td>
                    <td className="num">{c.last ? when(c.last) : "agora"}</td>
                    <td>{c.sprintId ?? <span className="muted">fora da sprint</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </>
    );
  }

  const chat = chats.find((c) => c.id === chatId);
  if (!chat) return <p className="muted">Chat não encontrado.</p>;
  return (
    <>
      <h2>{chat.title}</h2>
      <p className="muted">
        {when(chat.startedAt)} · {formatDuration(durationMs(chat.startedAt, chat.endedAt, now))}{" "}
        <Status end={chat.endedAt} live="em andamento" />
        {chat.sprintId && (
          <>
            {" · "}
            <Link
              to={`/p/${project.id}/sprints/${chat.sprintId}`}
            >{`Sprint ${chat.sprintId}`}</Link>
          </>
        )}
      </p>
      <h3>Agentes</h3>
      <div className="grid">
        {chat.agents.map((a) => (
          <div key={a.id} className="card">
            <strong>{a.name}</strong> <Status end={a.endedAt} live="rodando" />
            <p className="muted">
              {a.task && `Tarefa ${a.task} · `}
              {when(a.startedAt)} · {formatDuration(durationMs(a.startedAt, a.endedAt, now))}
            </p>
          </div>
        ))}
      </div>
      <h3>Tarefas</h3>
      <TaskList tasks={chat.tasks} now={now} />
    </>
  );
}
