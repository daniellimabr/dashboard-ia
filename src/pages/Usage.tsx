import { formatTokens, formatUsd } from "../lib/format";
import { data } from "../data/mock";
import { dailySeries, usageByProject } from "../lib/usage";
import { useProject } from "../lib/useProject";
import css from "./Usage.module.css";

const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const day = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;

const BAR = 20; // slot width per day in viewBox units
const H = 100;

export function Usage() {
  const project = useProject();
  const all = usageByProject(data.usage);
  const mine = all.find((p) => p.projectId === project.id);
  const series = dailySeries(data.usage, project.id);
  const max = Math.max(...series.map((d) => d.usd), 0) || 1;

  return (
    <>
      <h2>Consumo</h2>
      <div className="grid">
        <div className="card">
          <div className="muted">Gasto</div>
          <strong data-testid="usage-usd">{formatUsd(mine?.usd ?? 0)}</strong>
        </div>
        <div className="card">
          <div className="muted">Tokens</div>
          <strong>{formatTokens(mine?.tokens ?? 0)}</strong>
        </div>
        <div className="card">
          <div className="muted">Do gasto total</div>
          <strong>{pct(mine?.pct ?? 0)}</strong>
        </div>
      </div>

      <svg
        className={css.chart}
        viewBox={`0 0 ${series.length * BAR} ${H + 14}`}
        role="img"
        aria-label={`US$ por dia, ${series.length} dias`}
      >
        {series.map((d, i) => {
          const h = (d.usd / max) * H;
          return (
            <g key={d.date}>
              <rect x={i * BAR + 3} y={H - h} width={BAR - 6} height={h}>
                <title>{`${day(d.date)}: ${formatUsd(d.usd)}`}</title>
              </rect>
              {i % 4 === 0 || i === series.length - 1 ? (
                <text x={i * BAR + BAR / 2} y={H + 11}>
                  {day(d.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <table className={css.table}>
        <thead>
          <tr>
            <th>Projeto</th>
            <th>US$</th>
            <th>Tokens</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {all.map((p) => (
            <tr key={p.projectId}>
              <td>{data.projects.find((x) => x.id === p.projectId)?.name ?? p.projectId}</td>
              <td>{formatUsd(p.usd)}</td>
              <td>{formatTokens(p.tokens)}</td>
              <td>{pct(p.pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
