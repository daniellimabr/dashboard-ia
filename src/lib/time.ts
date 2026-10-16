export function durationMs(start: string, end?: string, now = Date.now()): number {
  return (end ? Date.parse(end) : now) - Date.parse(start);
}

export function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "< 1 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

export const formatTime = (iso: string) => timeFmt.format(Date.parse(iso));
export const formatDate = (iso: string) => dateFmt.format(Date.parse(iso));
