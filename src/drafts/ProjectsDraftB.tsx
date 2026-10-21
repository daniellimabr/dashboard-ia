import { ProgressRow } from "../components/ProgressRow";
import { Spark } from "../components/Spark";
import { formatTokens, formatUsd } from "../lib/format";
import { dailySeries } from "../lib/usage";
import { useData } from "../lib/useData";
import { useProject } from "../lib/useProject";
import css from "../pages/Usage.module.css";
import { Variants } from "./Variants";

// Example data: the mock has no backlog status, roadmap stages or usage by agent yet (see `sources`).
type Status = "Planejado" | "Em andamento" | "Pronto";
const tone: Record<Status, string> = { Planejado: "", "Em andamento": "p-run", Pronto: "p-ok" };
const backlog: { id: string; item: string; status: Status; sprint?: string; done?: string }[] = [
  {
    id: "B01",
    item: "Sala de controle com abas por projeto",
    status: "Pronto",
    sprint: "S04",
    done: "2026-10-12",
  },
  { id: "B02", item: "Consumo por agente e por sprint", status: "Em andamento", sprint: "S06" },
  { id: "B03", item: "Backlog com status por item", status: "Em andamento", sprint: "S06" },
  { id: "B04", item: "Roadmap com etapa atual", status: "Planejado", sprint: "S07" },
  { id: "B05", item: "Alertas de limite por e-mail", status: "Planejado" },
  {
    id: "B06",
    item: "Chats agrupados por sprint",
    status: "Pronto",
    sprint: "S05",
    done: "2026-10-18",
  },
];
const stages = [
  { name: "Fundação", items: ["B01", "B06"], sprints: "S01–S05" },
  { name: "Projetos", items: ["B02", "B03", "B04"], sprints: "S06–S07", current: true },
  { name: "Automação", items: ["B05"], sprints: "S08+" },
];
const itemStatus = (id: string) => backlog.find((b) => b.id === id);
const agents = [
  { agent: "Tech Lead", usd: 6.4, tokens: 3_900_000, week: [0.8, 1.1, 0.9, 1.4, 0.7, 0.6, 0.9] },
  { agent: "Clones", usd: 4.1, tokens: 2_500_000, week: [0.2, 0.9, 0.7, 0.8, 0.5, 0.4, 0.6] },
  { agent: "Reviewer", usd: 1.3, tokens: 800_000, week: [0.1, 0.2, 0.3, 0.2, 0.2, 0.1, 0.2] },
];
const day = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;
const Pill = ({ s }: { s: Status }) => <span className={`pill ${tone[s]}`}>{s}</span>;

export function BacklogDraft() {
  const cols: Status[] = ["Planejado", "Em andamento", "Pronto"];
  const a = (
    <section className="card">
      <table className={css.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Item</th>
            <th>Status</th>
            <th>Sprint</th>
            <th>Pronto em</th>
          </tr>
        </thead>
        <tbody>
          {backlog.map((b) => (
            <tr key={b.id}>
              <td className="mono">{b.id}</td>
              <td style={{ textAlign: "left" }}>{b.item}</td>
              <td>
                <Pill s={b.status} />
              </td>
              <td>
                {b.sprint ? (
                  <span className="chip">{b.sprint}</span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td className="num">{b.done ? day(b.done) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
  const b = (
    <div className="grid">
      {cols.map((c) => {
        const items = backlog.filter((x) => x.status === c);
        return (
          <section key={c} className="card">
            <h3>
              {c} <span className="muted num">({items.length})</span>
            </h3>
            {items.map((x) => (
              <ProgressRow
                key={x.id}
                level={2}
                title={x.item}
                sub={x.id}
                chips={x.sprint && <span className="chip">{x.sprint}</span>}
                below={x.done && `pronto em ${day(x.done)}`}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
  return (
    <Variants
      a={a}
      b={b}
      sources={
        <p>
          Hoje: <code>backlog.md</code> em texto livre. Falta: tabela{" "}
          <code>| ID | Item | Status | Sprint | Pronto em |</code> no <code>backlog.md</code>; o
          servidor lê as linhas. A = tabela de controle; B = quadro por status.
        </p>
      }
    />
  );
}

export function RoadmapDraft() {
  const current = stages.find((s) => s.current);
  const chips = (item: string) => {
    const b = itemStatus(item);
    return b ? (
      <>
        <Pill s={b.status} /> {b.sprint && <span className="chip">{b.sprint}</span>}
      </>
    ) : (
      <span className="chip">sem sprint</span>
    );
  };
  const a = (
    <section className="card">
      {stages.map((s, i) => {
        const done = s.items.filter((it) => itemStatus(it)?.status === "Pronto").length;
        return (
          <ProgressRow
            key={s.name}
            title={`${i + 1}. ${s.name}`}
            sub={s.sprints}
            pct={Math.round((done / s.items.length) * 100)}
            chips={s.current && <span className="chip run">atual</span>}
            defaultOpen={s.current}
          >
            {s.items.map((it) => (
              <ProgressRow
                key={it}
                level={2}
                title={itemStatus(it)?.item}
                sub={it}
                chips={chips(it)}
              />
            ))}
          </ProgressRow>
        );
      })}
    </section>
  );
  const b = (
    <>
      <ol aria-label="Etapas" className="grid" style={{ listStyle: "none", padding: 0 }}>
        {stages.map((s, i) => (
          <li
            key={s.name}
            className="card"
            style={s.current ? { borderColor: "var(--accent)" } : { opacity: 0.6 }}
          >
            <div className="lbl">Etapa {i + 1}</div>
            <strong>{s.name}</strong> {s.current && <span className="chip run">atual</span>}
            <div className="muted">{s.sprints}</div>
          </li>
        ))}
      </ol>
      {current && (
        <section className="card">
          <h3>{current.name}: itens</h3>
          {current.items.map((it) => (
            <ProgressRow
              key={it}
              level={2}
              title={itemStatus(it)?.item}
              sub={it}
              chips={chips(it)}
            />
          ))}
        </section>
      )}
    </>
  );
  return (
    <Variants
      a={a}
      b={b}
      sources={
        <p>
          Hoje: <code>roadmap.md</code> em texto livre. Falta: um título por etapa com{" "}
          <code>(atual)</code> na etapa corrente e itens com o ID do backlog (status e sprint vêm de
          lá). A = etapas em acordeão; B = linha de etapas + itens da atual.
        </p>
      }
    />
  );
}

export function UsageDraft() {
  const { data } = useData();
  const project = useProject();
  const series = dailySeries(data.usage, project.id);
  const sprints = data.sprints.filter((s) => s.projectId === project.id && s.usd != null);
  const total = series.reduce((s, d) => s + d.usd, 0);
  const tokens = series.reduce((s, d) => s + d.tokens, 0);
  const maxDay = Math.max(...series.map((d) => d.usd), 0.01);
  const maxSprint = Math.max(...sprints.map((s) => s.usd ?? 0), 0.01);
  const agentUsd = agents.reduce((s, a) => s + a.usd, 0);
  const bars = (rows: { k: string; usd: number; max: number; extra?: string }[]) =>
    rows.map((r) => (
      <div key={r.k} style={{ margin: "8px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{r.k}</span>
          <span className="num">
            {formatUsd(r.usd)} {r.extra && <span className="muted">· {r.extra}</span>}
          </span>
        </div>
        <div className="bar">
          <i style={{ width: `${(r.usd / r.max) * 100}%` }} />
        </div>
      </div>
    ));
  const kpis = (
    <div className="grid">
      <div className="card">
        <div className="muted">Gasto</div>
        <strong>{formatUsd(total)}</strong>
      </div>
      <div className="card">
        <div className="muted">Tokens</div>
        <strong>{formatTokens(tokens)}</strong>
      </div>
      <div className="card">
        <div className="muted">Média por dia</div>
        <strong>{formatUsd(series.length ? total / series.length : 0)}</strong>
      </div>
    </div>
  );
  const a = (
    <>
      {kpis}
      <section className="card">
        <h3>Por dia</h3>
        {bars(
          series.slice(-7).map((d) => ({
            k: day(d.date),
            usd: d.usd,
            max: maxDay,
            extra: formatTokens(d.tokens),
          })),
        )}
      </section>
      <div className="grid">
        <section className="card">
          <h3>Por sprint</h3>
          {bars(
            sprints.map((s) => ({ k: `${s.id} · ${s.title}`, usd: s.usd ?? 0, max: maxSprint })),
          )}
        </section>
        <section className="card">
          <h3>Por agente</h3>
          {bars(
            agents.map((g) => ({
              k: g.agent,
              usd: g.usd,
              max: agentUsd,
              extra: formatTokens(g.tokens),
            })),
          )}
        </section>
      </div>
    </>
  );
  const b = (
    <>
      {kpis}
      <div className="grid">
        {agents.map((g) => (
          <div key={g.agent} className="card">
            <div className="muted">{g.agent} · 7 dias</div>
            <strong>{formatUsd(g.usd)}</strong>
            <Spark values={g.week} label={`${g.agent}: US$ por dia, 7 dias`} />
          </div>
        ))}
      </div>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Agente</th>
            <th>US$</th>
            <th>Tokens</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((g) => (
            <tr key={g.agent}>
              <td>{g.agent}</td>
              <td>{formatUsd(g.usd)}</td>
              <td>{formatTokens(g.tokens)}</td>
              <td className="num">{Math.round((g.usd / agentUsd) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
  return (
    <Variants
      a={a}
      b={b}
      sources={
        <p>
          Por dia: <code>usage</code> do mock (real). Por sprint: <code>sprint.usd</code> (real).
          Por agente: exemplo; falta o evento <code>usage</code> do harness trazer{" "}
          <code>agent</code> e <code>sprint</code>. A = barras por dia, sprint e agente; B =
          tendência e tabela por agente.
        </p>
      }
    />
  );
}
