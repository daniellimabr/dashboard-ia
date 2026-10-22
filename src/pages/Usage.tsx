import s from "../components/ui.module.css";
import { Accordion, Empty, Meter, Panel, Tip } from "../components/ui";
import { formatTokens, formatUsd } from "../lib/format";
import { formatWeekday } from "../lib/time";
import { dailySeries, usageByProject } from "../lib/usage";
import { useData } from "../lib/useData";
import { useProject } from "../lib/useProject";

const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const day = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;

export function Usage() {
  const { data } = useData();
  const project = useProject();
  const all = usageByProject(data.usage);
  const mine = all.find((p) => p.projectId === project.id);
  const series = dailySeries(data.usage, project.id);
  const max = Math.max(0.01, ...series.map((d) => d.usd));
  const total = mine?.usd ?? 0;

  return (
    <>
      <p className={s.muted}>Gasto do projeto por dia, aberto por sprint.</p>
      <div className={s.stack}>
        <Panel title="Total do projeto">
          <div className={s.bigRow}>
            <strong className={s.big} data-testid="usage-usd">
              {formatUsd(total)}
            </strong>
            <span className={s.muted}>{formatTokens(mine?.tokens ?? 0)} tokens</span>
          </div>
          <Meter
            label="Parte do gasto total"
            pct={mine && Math.round(mine.pct)}
            text={mine ? `${pct(mine.pct)} do gasto de todos os projetos` : undefined}
            tone="run"
            showValue
          />
          {series.length > 0 && (
            <figure className={s.spend}>
              <figcaption className={s.k}>Gasto por dia (US$)</figcaption>
              <div className={s.cols7}>
                {series.map((d, i) => (
                  <span
                    key={d.date}
                    className={s.tipHost}
                    tabIndex={0}
                    aria-label={`${day(d.date)}: ${formatUsd(d.usd)}, ${formatTokens(d.tokens)} tokens`}
                    style={{ height: `${Math.max(4, (d.usd / max) * 100)}%` }}
                    data-last={i === series.length - 1 || undefined}
                  >
                    <Tip>
                      {day(d.date)} · {formatUsd(d.usd)} · {formatTokens(d.tokens)} tokens
                    </Tip>
                  </span>
                ))}
              </div>
              <div className={s.cols7Axis} aria-hidden="true">
                {series.map((d) => (
                  <span key={d.date}>{formatWeekday(d.date + "T12:00:00Z")}</span>
                ))}
              </div>
            </figure>
          )}
        </Panel>

        <Panel title="Por dia">
          {!series.length && <Empty title="Sem consumo">sem dado</Empty>}
          {series.toReversed().map((d) => {
            const rows = data.usage.filter((u) => u.projectId === project.id && u.date === d.date);
            const sorted = [...rows.filter((u) => u.sprintId), ...rows.filter((u) => !u.sprintId)];
            return (
              <Accordion
                key={d.date}
                summary={
                  <span className={s.accSum}>
                    <b>{day(d.date)}</b>
                    <span className={s.muted}>{formatTokens(d.tokens)} tokens</span>
                    <span>{formatUsd(d.usd)}</span>
                    <span className={s.muted}>{total ? pct((d.usd / total) * 100) : "—"}</span>
                    <Meter
                      label={`Gasto de ${day(d.date)}`}
                      pct={Math.round((d.usd / max) * 100)}
                      tone="run"
                    />
                  </span>
                }
              >
                <div className={s.scrollX}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Sprint</th>
                        <th className={s.r}>US$</th>
                        <th className={s.r}>Tokens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((u) => (
                        <tr key={u.sprintId ?? ""}>
                          <td>{u.sprintId ?? "Fora de sprint"}</td>
                          <td className={s.r}>{formatUsd(u.usd)}</td>
                          <td className={s.r}>{formatTokens(u.tokens)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Accordion>
            );
          })}
        </Panel>

        <Panel title="Projetos">
          <div className={s.scrollX}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th className={s.r}>US$</th>
                  <th className={s.r}>Tokens</th>
                  <th className={s.r}>%</th>
                </tr>
              </thead>
              <tbody>
                {all.map((p) => (
                  <tr key={p.projectId}>
                    <td>{data.projects.find((x) => x.id === p.projectId)?.name ?? p.projectId}</td>
                    <td className={s.r}>{formatUsd(p.usd)}</td>
                    <td className={s.r}>{formatTokens(p.tokens)}</td>
                    <td className={s.r}>{pct(p.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
