import { Link, useParams } from "react-router";
import { TaskList } from "../components/TaskList";
import { data } from "../data/mock";
import { durationMs, formatDate, formatDuration, formatTime } from "../lib/time";
import { useNow } from "../lib/useNow";
import { useProject } from "../lib/useProject";

const when = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

function Status({ end, live }: { end?: string; live: string }) {
  return end ? (
    <span className="badge">encerrado</span>
  ) : (
    <span className="badge badge-live">{live}</span>
  );
}

export function Chats() {
  const project = useProject();
  const { chatId } = useParams();
  const now = useNow();
  const chats = data.chats.filter((c) => c.projectId === project.id);

  if (!chatId) {
    return (
      <>
        <h2>Chats</h2>
        {!chats.length && <p className="muted">Nenhum chat.</p>}
        <div className="grid">
          {chats.map((c) => {
            const running = c.agents.filter((a) => !a.endedAt).length;
            return (
              <div key={c.id} className="card">
                <h3>
                  <Link to={c.id}>{c.title}</Link>
                </h3>
                <p className="muted">
                  {when(c.startedAt)} · {formatDuration(durationMs(c.startedAt, c.endedAt, now))}
                </p>
                <Status end={c.endedAt} live="em andamento" />{" "}
                {running > 0 && (
                  <span className="muted">{`${running} ${running > 1 ? "agentes rodando" : "agente rodando"}`}</span>
                )}
              </div>
            );
          })}
        </div>
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
