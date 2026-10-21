import { Link } from "react-router";
import { ProgressRow } from "../components/ProgressRow";
import { TaskList } from "../components/TaskList";
import type { Chat, Doc, Sprint } from "../data/types";
import { durationMs, formatDate, formatDuration, formatTime } from "../lib/time";
import { useData } from "../lib/useData";
import { useNow } from "../lib/useNow";
import { useProject } from "../lib/useProject";
import { Variants } from "./Variants";

const when = (iso: string) => `${formatDate(iso)} ${formatTime(iso)}`;

// Chat has no "last interaction": estimate it from the latest end among chat, agents and tasks; running = now.
function lastAt(c: Chat, now: number) {
  if (!c.endedAt || c.agents.some((a) => !a.endedAt)) return new Date(now).toISOString();
  return [...c.agents.map((a) => a.endedAt), ...c.tasks.map((t) => t.endedAt)].reduce<string>(
    (max, x) => (x && x > max ? x : max),
    c.endedAt,
  );
}

function useChats() {
  const { data } = useData();
  const project = useProject();
  const now = useNow();
  return data.chats
    .filter((c) => c.projectId === project.id)
    .map((c) => ({ ...c, last: lastAt(c, now) }))
    .sort((x, y) => y.last.localeCompare(x.last));
}

const Status = ({ c }: { c: Chat }) =>
  c.endedAt ? (
    <span className="badge">encerrado</span>
  ) : (
    <span className="badge badge-live">em andamento</span>
  );

export function ChatsDraft() {
  const chats = useChats();
  const a = (
    <>
      <h2>Chats</h2>
      <div className="grid">
        {chats.map((c) => (
          <div key={c.id} className="card">
            <h3>
              <Link to={`/p/${c.projectId}/chats/${c.id}`}>{c.title}</Link>
            </h3>
            <p className="muted">
              início {when(c.startedAt)} · última interação {when(c.last)}
            </p>
            <Status c={c} />
          </div>
        ))}
      </div>
    </>
  );
  const b = (
    <>
      <h2>Chats</h2>
      <div className="markdown">
        <table>
          <thead>
            <tr>
              <th>Chat</th>
              <th>Início</th>
              <th>Última interação</th>
              <th>Duração</th>
              <th>Sprint</th>
            </tr>
          </thead>
          <tbody>
            {chats.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/p/${c.projectId}/chats/${c.id}`}>{c.title}</Link> <Status c={c} />
                </td>
                <td className="num">{when(c.startedAt)}</td>
                <td className="num">{when(c.last)}</td>
                <td className="num">{formatDuration(durationMs(c.startedAt, c.last))}</td>
                <td>{c.sprintId ?? <span className="muted">fora da sprint</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
  return (
    <Variants
      a={a}
      b={b}
      sources={
        <ul>
          <li>
            Lista: `data.chats` do projeto, ordenada pela última interação (mais recente primeiro).
          </li>
          <li>
            Título: hoje é genérico; um título útil depende do pedido ao harness de 2026-10-21.
          </li>
          <li>
            Última interação: o tipo `Chat` não tem esse campo; aqui é estimada pelo último fim de
            agente ou tarefa (chat aberto = agora). Falta o evento do harness.
          </li>
        </ul>
      }
    />
  );
}

const STATUS = {
  planned: ["planejada", ""],
  active: ["ativa", "badge-live"],
  closed: ["fechada", "badge-ok"],
} as const;

function SprintRows({ withTasks }: { withTasks?: boolean }) {
  const { data } = useData();
  const project = useProject();
  const docs = data.docs.filter((d) => d.projectId === project.id);
  const docOf = (s: Sprint, kind: Doc["kind"]) =>
    docs.find((d) => d.kind === kind && d.id.startsWith(`${s.id}-`));
  const sprints = data.sprints.filter((s) => s.projectId === project.id).reverse();
  return sprints.map((s) => {
    const [label, cls] = STATUS[s.status];
    const done = s.tasks.filter((t) => t.done).length;
    const pct = s.tasks.length ? Math.round((done / s.tasks.length) * 100) : 0;
    const dates = s.startedAt
      ? `${formatDate(s.startedAt)} – ${s.closedAt ? formatDate(s.closedAt) : "hoje"}`
      : "não iniciada";
    const link = (kind: Doc["kind"], text: string) => {
      const d = docOf(s, kind);
      return d ? (
        <Link to={`/p/${project.id}/docs/${encodeURIComponent(d.id)}`}>{text}</Link>
      ) : (
        <span className="muted">{text}: ainda não existe</span>
      );
    };
    return (
      <ProgressRow
        key={`${s.id}-${withTasks}`} // remount on variant switch so defaultOpen applies
        title={
          <>
            <strong>{s.id}</strong> {s.title}
          </>
        }
        sub={s.goal}
        right={dates}
        pct={pct}
        chips={
          <>
            <span className={`badge ${cls}`}>{label}</span>{" "}
            <span className="muted">{`${done}/${s.tasks.length} tarefas`}</span>
          </>
        }
        defaultOpen={withTasks && s.status === "active"}
      >
        <p>
          {link("sprint-plan", "Sprint plan")} · {link("release-report", "Release Report")}
        </p>
        {withTasks && <TaskList tasks={s.tasks} />}
      </ProgressRow>
    );
  });
}

export function SprintsDraft() {
  return (
    <Variants
      a={
        <>
          <h2>Sprints</h2>
          <SprintRows />
        </>
      }
      b={
        <>
          <h2>Sprints</h2>
          <SprintRows withTasks />
        </>
      }
      sources={
        <ul>
          <li>Resumo: `data.sprints` (objetivo, status, início/fim, tarefas feitas).</li>
          <li>
            Links: documento do projeto com id `SNN-plan` / `SNN-report`. No repo o Release Report é
            `docs/sprints/SNN-release.md`; o importador precisa mapear esse nome.
          </li>
          <li>B abre a sprint ativa e mostra as tarefas dentro do acordeão.</li>
        </ul>
      }
    />
  );
}

const KINDS: [Doc["kind"], string, string][] = [
  ["adr", "ADRs", "ADR"],
  ["prd", "PRDs", "PRD"],
];

export function DocsDraft() {
  const { data } = useData();
  const project = useProject();
  const docs = data.docs.filter(
    (d) => d.projectId === project.id && (d.kind === "adr" || d.kind === "prd"),
  );
  const url = (d: Doc) => `/p/${project.id}/docs/${encodeURIComponent(d.id)}`;
  const a = KINDS.map(([kind, label]) => (
    <section key={kind}>
      <h2>{label}</h2>
      <ul>
        {docs
          .filter((d) => d.kind === kind)
          .map((d) => (
            <li key={d.id}>
              <Link to={url(d)}>{d.title}</Link>
            </li>
          ))}
      </ul>
    </section>
  ));
  const b = (
    <>
      <h2>Documentos</h2>
      <ul
        className="grid"
        aria-label="Decisões e requisitos"
        style={{ listStyle: "none", padding: 0 }}
      >
        {[...docs]
          .sort((x, y) => (y.date ?? "").localeCompare(x.date ?? ""))
          .map((d) => (
            <li key={d.id} className="card">
              <span className="badge">{KINDS.find(([k]) => k === d.kind)?.[2]}</span>{" "}
              <Link to={url(d)}>{d.title}</Link>
              {d.date && <p className="muted">{formatDate(d.date)}</p>}
            </li>
          ))}
      </ul>
    </>
  );
  return (
    <Variants
      a={a}
      b={b}
      sources={
        <ul>
          <li>
            `data.docs` do projeto, só `kind` adr e prd (sprint plans e Release Reports ficam em
            Sprints).
          </li>
          <li>A: agrupado por tipo. B: lista única por data, com selo do tipo.</li>
          <li>Data: campo `date` do documento (opcional; sem data vai para o fim).</li>
        </ul>
      }
    />
  );
}
