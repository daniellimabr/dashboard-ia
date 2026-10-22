import type { ReactNode } from "react";
import { STEPS, type Task, type Tone } from "../../data/types";
import { taskStatus } from "../../lib/progress";
import s from "./a.module.css";

export type Hue = Tone | "idle";

export const meterTone = (pct: number): Hue => (pct >= 80 ? "bad" : pct >= 60 ? "warn" : "ok");

export const taskTone = (t: Task): Hue =>
  (({ done: "ok", failed: "bad", running: "run", todo: "idle" }) as const)[taskStatus(t)];

export const TASK_LABEL = {
  done: "feita",
  failed: "reprovada",
  running: "rodando",
  todo: "a fazer",
};

export function Badge({
  tone,
  live,
  children,
}: {
  tone: Hue;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`${s.badge} ${s[tone]} ${live ? s.live : ""}`}>
      <i aria-hidden />
      {children}
    </span>
  );
}

/** Horizontal meter; `pct` undefined = "sem dado". */
export function Meter({ label, pct, tone }: { label: string; pct?: number; tone?: Hue }) {
  const v = pct ?? 0;
  return (
    <span className={s.meter}>
      <span
        className={s.track}
        role="meter"
        aria-label={label}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={pct === undefined ? "sem dado" : `${v}%`}
      >
        <i className={s[tone ?? meterTone(v)]} style={{ width: `${v}%` }} />
      </span>
      <b className={s.num}>{pct === undefined ? "--" : `${v}%`}</b>
    </span>
  );
}

/** Five ticks, one per step (Teste … Commit). */
export function Steps({ t }: { t: Task }) {
  const n = t.done ? STEPS.length : (t.steps ?? 0);
  const tone = taskTone(t);
  return (
    <span className={s.steps} title={STEPS.map((x, i) => `${x}${i < n ? " ✓" : ""}`).join(" / ")}>
      {STEPS.map((x, i) => (
        <i key={x} className={i < n ? s.ok : i === n && tone !== "idle" ? s[tone] : undefined} />
      ))}
    </span>
  );
}

export function Card({
  title,
  aside,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={s.card}>
      <header>
        <h3>{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Accordion({
  title,
  aside,
  open,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={s.acc} open={open}>
      <summary>
        <span>{title}</span>
        {aside}
      </summary>
      <div>{children}</div>
    </details>
  );
}

export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: [T, string][];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className={s.tabs} role="tablist" aria-label={label}>
      {items.map(([k, text]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={k === value}
          onClick={() => onChange(k)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      <b>{title}</b>
      {children}
    </div>
  );
}
