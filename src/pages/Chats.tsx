import { useParams } from "react-router";
import { Accordion, Empty, Pill } from "../components/ui";
import s from "../components/ui.module.css";
import { durationMs, formatDate, formatDuration, formatTime } from "../lib/time";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";
import { useProject } from "../lib/useProject";
import p from "./Chats.module.css";

const when = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

export function Chats() {
  const { data } = useData();
  const project = useProject();
  const { chatId } = useParams();
  const now = useNow();
  const chats = data.chats.filter((c) => c.projectId === project.id);
  if (!chats.length)
    return <Empty title="Nenhum chat ainda">Os chats do projeto aparecem aqui ao abrir.</Empty>;
  return (
    <div className={s.stack}>
      {chats
        .sort(
          (a, b) =>
            Number(!b.endedAt) - Number(!a.endedAt) || b.startedAt.localeCompare(a.startedAt),
        )
        .map((c) => (
          <Accordion
            key={c.id}
            open={c.id === chatId}
            summary={
              <span className={p.chatSum}>
                <b>{c.title}</b>
                {c.endedAt ? (
                  <Pill>encerrado</Pill>
                ) : (
                  <Pill tone="run" live>
                    em andamento
                  </Pill>
                )}
                {c.sprintId ? (
                  <Pill tone="ok">{c.sprintId}</Pill>
                ) : (
                  <Pill tone="warn">sem sprint</Pill>
                )}
                <span className={s.muted}>
                  {when(c.startedAt)} · {formatDuration(durationMs(c.startedAt, c.endedAt, now))}
                </span>
              </span>
            }
          >
            <ul className={s.agents}>
              {c.agents.map((a) => (
                <li key={a.id}>
                  <span className={s.av}>{a.name.slice(0, 2)}</span>
                  <span>
                    {a.name}
                    <small className={s.muted}>
                      {a.task ? `${a.task} · ` : ""}
                      {a.doing ?? ""}
                    </small>
                  </span>
                  <span className={s.muted}>{a.endedAt ? "encerrado" : "rodando"}</span>
                </li>
              ))}
            </ul>
            {c.tasks.map((t) => (
              <p key={t.id}>
                <b>{t.id}</b> {t.title}{" "}
                <span className={s.muted}>{t.done ? "· feita" : "· aberta"}</span>
              </p>
            ))}
          </Accordion>
        ))}
    </div>
  );
}
