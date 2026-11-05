import type { Consumption } from "../data/types";
import { formatUsd } from "./format";

const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Share of a limit, uncapped (may pass 100); one decimal at most. */
export const formatPct = (n: number) => `${pctFmt.format(n)}%`;

/** US$ and share of the 5 h window and of the week; no reading = "—", never zero. */
export const costLine = (c?: Consumption) =>
  c
    ? `${formatUsd(c.usd)} · ${formatPct(c.pct5h)} das 5 h · ${formatPct(c.pctWeek)} da semana`
    : "—";
