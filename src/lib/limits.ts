import { formatTime, formatWeekday } from "./time";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Text for a usage limit's reset: countdown "renova em hh:mm" ("renova em 1D-hh:mm" past 24 h)
 * and the expected time ("às HH:MM", or "sex HH:MM" when weekly). No resetsAt: "sem dado".
 */
export function resetLabel(resetsAt: string | undefined, now: number, weekly: boolean) {
  if (!resetsAt) return { countdown: "sem dado", at: "" };
  const min = Math.max(0, Math.floor((Date.parse(resetsAt) - now) / 60_000));
  const time = formatTime(resetsAt);
  const days = Math.floor(min / 1440);
  return {
    countdown: `renova em ${days ? `${days}D-` : ""}${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`,
    at: weekly ? `${formatWeekday(resetsAt)} ${time}` : `às ${time}`,
  };
}
