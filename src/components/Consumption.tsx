import type { Consumption } from "../data/types";
import { formatTokens } from "../lib/format";
import k from "./Consumption.module.css";

/** Tokens by kind, four compact label/value pairs; no reading = "—". */
export function Kinds({ c }: { c?: Consumption }) {
  const rows = [
    ["Entrada", c?.input],
    ["Saída", c?.output],
    ["Cache lido", c?.cacheRead],
    ["Cache escrito", c?.cacheWrite],
  ] as const;
  return (
    <dl className={k.kinds}>
      {rows.map(([name, n]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>{n === undefined ? "—" : formatTokens(n)}</dd>
        </div>
      ))}
    </dl>
  );
}
