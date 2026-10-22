import { Link } from "react-router";
import s from "../components/ui.module.css";
import { mainSprint, Meter, Panel, Pill } from "../components/ui";
import { STEPS, type Project } from "../data/types";
import { formatUsd } from "../lib/format";
import { sprintPct, taskStatus } from "../lib/progress";
import { formatTime } from "../lib/time";
import { useBoard } from "../lib/useBoard";
import { useData } from "../lib/useData";
import { IdleList } from "./Idle";

function ProjectPanel({ p, focus }: { p: Project; focus: boolean }) {
  const { data } = useData();
  const sprint = mainSprint(data, p.id);
  const tasks = sprint?.tasks ?? [];
  const current =
    tasks.find((t) => ["running", "failed"].includes(taskStatus(t))) ?? tasks.find((t) => !t.done);
  const pct = sprintPct(tasks);
  const chats = data.chats.filter((c) => c.projectId === p.id && !c.endedAt);
  const today = data.usage.filter((u) => u.projectId === p.id).at(-1);
  return (
    <Panel
      label={p.name}
      wide={focus}
      title={
        <Link
          to={`/p/${encodeURIComponent(p.id)}/sprints`}
          className={s.linkBtn}
          aria-label={`Abrir sprints de ${p.name}`}
        >
          {p.name}
        </Link>
      }
      aside={
        p.phase && (
          <Pill tone={p.phase.tone} live={p.phase.live}>
            {p.phase.label}
          </Pill>
        )
      }
    >
      <div className={s.cardGrid}>
        <div className={s.sprintBox}>
          <span className={s.k} data-testid="sprint">
            {sprint ? `${sprint.id} · ${sprint.title}` : "Sem sprint"}
          </span>
          <div className={s.bigRow}>
            <strong className={s.big}>{pct}%</strong>
            <span className={s.muted}>
              {tasks.filter((t) => t.done).length} de {tasks.length} tarefas
            </span>
          </div>
          <Meter label={`Progresso de ${p.name}`} pct={pct} tone="run" />
          <p className={s.current} data-testid="current-task">
            {current ? (
              <>
                <b>{current.id}</b> {current.title}
                <span className={s.muted}>
                  {current.review === "fail"
                    ? " · reprovada, em correção"
                    : current.startedAt
                      ? ` · em ${STEPS[current.steps ?? 0] ?? "Commit"}`
                      : " · próxima"}
                </span>
              </>
            ) : (
              <span className={s.muted}>Nenhuma tarefa aberta</span>
            )}
          </p>
        </div>
        <dl className={s.facts}>
          <div>
            <dt>Gasto da sprint</dt>
            <dd>{formatUsd(sprint?.usd ?? 0)}</dd>
          </div>
          <div>
            <dt>Hoje</dt>
            <dd>{formatUsd(today?.usd ?? 0)}</dd>
          </div>
        </dl>
      </div>
      {p.alerts?.map((a) => (
        <div key={a.title} className={s.alert} data-tone={a.tone}>
          <b>{a.title}</b>
          <span>{a.detail}</span>
        </div>
      ))}
      <div className={s.chats}>
        <span className={s.k}>Chats abertos ({chats.length})</span>
        {chats.length ? (
          <ul>
            {chats.map((c) => (
              <li key={c.id}>
                <span>{c.title}</span>
                <span className={s.muted}>
                  {c.agents.filter((a) => !a.endedAt).length} agentes · desde{" "}
                  {formatTime(c.startedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className={s.muted}>Nenhum chat aberto</span>
        )}
      </div>
    </Panel>
  );
}

export function Home() {
  const { active, idle, project } = useBoard();
  const ordered = [...active].sort(
    (a, b) => Number(b.id === project?.id) - Number(a.id === project?.id),
  );
  const waiting = active.filter((p) => p.alerts?.length).length;
  return (
    <>
      <div className={s.pageHead}>
        <h1>Início</h1>
        <p className={s.muted}>
          {waiting
            ? `${waiting} de ${active.length} projetos esperam algo de você.`
            : "Nenhum projeto espera por você agora."}
        </p>
      </div>
      <div className={s.board}>
        {ordered.map((p) => (
          <ProjectPanel key={p.id} p={p} focus={p.id === project?.id} />
        ))}
        <Panel title={`Ociosos (${idle.length})`} wide>
          <IdleList />
        </Panel>
      </div>
    </>
  );
}
