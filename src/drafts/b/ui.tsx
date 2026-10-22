import type { ReactNode } from "react";
import type { Tone } from "../../data/types";
import s from "./b.module.css";

export function Button({
  kind = "secondary",
  children,
  onClick,
}: {
  kind?: "primary" | "secondary" | "quiet";
  children: ReactNode;
  onClick?: () => void;
}) {
  const cls = kind === "primary" ? s.btnPrimary : kind === "quiet" ? s.btnQuiet : "";
  return (
    <button type="button" className={`${s.btn} ${cls}`} onClick={onClick}>
      {children}
    </button>
  );
}

export const Badge = ({
  tone,
  live,
  children,
}: {
  tone?: Tone;
  live?: boolean;
  children: ReactNode;
}) => (
  <span className={s.badge} data-tone={tone} data-live={live || undefined}>
    {children}
  </span>
);

export const Card = ({ children }: { children: ReactNode }) => (
  <div className={s.card}>{children}</div>
);

export const meterTone = (pct: number): Tone | undefined =>
  pct >= 80 ? "bad" : pct >= 60 ? "warn" : undefined;

export function Meter({ label, pct, tone }: { label: string; pct?: number; tone?: Tone }) {
  const v = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div
      className={s.meter}
      role="meter"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={pct === undefined ? "sem dado" : `${v}%`}
      data-tone={tone}
    >
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Accordion = ({
  summary,
  open,
  children,
}: {
  summary: ReactNode;
  open?: boolean;
  children: ReactNode;
}) => (
  <details className={s.acc} open={open}>
    <summary>{summary}</summary>
    <div className={s.accBody}>{children}</div>
  </details>
);

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { id: T; label: string; disabled?: boolean }[];
  value: T;
  onChange?: (id: T) => void;
}) {
  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          className={s.tab}
          aria-selected={t.id === value}
          disabled={t.disabled}
          onClick={() => onChange?.(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const Empty = ({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) => (
  <div className={s.empty}>
    <h3 className={s.h3}>{title}</h3>
    <p>{text}</p>
    {action}
  </div>
);
