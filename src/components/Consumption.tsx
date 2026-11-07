import type { Consumption, TokenKinds } from "../data/types";
import { formatTokens, formatUsd } from "../lib/format";
import k from "./Consumption.module.css";

const cost = (n?: number) => (n === undefined ? "—" : n < 0.01 ? "US$ <0,01" : formatUsd(n));

/** Tokens by kind, four compact label/value pairs; no reading = "—". With `usd`, each shows its cost below. */
export function Kinds({ c, usd, costs }: { c?: Consumption; usd?: TokenKinds; costs?: boolean }) {
  const rows = [
    ["Entrada", "input"],
    ["Saída", "output"],
    ["Cache lido", "cacheRead"],
    ["Cache escrito", "cacheWrite"],
  ] as const;
  return (
    <dl className={k.kinds}>
      {rows.map(([name, key]) => (
        <div key={name} data-kind={key}>
          <dt>{name}</dt>
          <dd>
            {c ? formatTokens(c[key]) : "—"}
            {costs && c && <small>({cost(usd?.[key])})</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
