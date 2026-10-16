const usdFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });
const tokensFmt = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export const formatUsd = (n: number) => usdFmt.format(n);
export const formatTokens = (n: number) => tokensFmt.format(n);
