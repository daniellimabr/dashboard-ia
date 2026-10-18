import { useState, type ReactNode } from "react";
import css from "./ProgressRow.module.css";

interface Props {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode; // top-right text, before the %
  pct?: number; // shows "% " and the gradient bar
  chips?: ReactNode;
  below?: ReactNode; // bottom-right, e.g. "previsto 40 min"
  level?: 1 | 2;
  wave?: number; // 1-based; tints the row with the wave color
  className?: string;
  defaultOpen?: boolean;
  children?: ReactNode; // when present the row is an accordion
}

/** Accordion/progress row of the control room (draft: `.row` / `.rh`). */
export function ProgressRow({
  title,
  sub,
  right,
  pct,
  chips,
  below,
  level = 1,
  wave,
  className = "",
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const body = (
    <>
      <span className={css.title}>
        {title}
        {sub && <small>{sub}</small>}
      </span>
      <span className={css.right}>
        {right}
        {pct != null && <b className="num">{pct}%</b>}
      </span>
      <span className={css.chips}>{chips}</span>
      <span className={css.below}>{below}</span>
      {pct != null && (
        <span className={css.bar}>
          <i style={{ clipPath: `inset(0 ${100 - pct}% 0 0 round 3px)` }} />
        </span>
      )}
    </>
  );
  const cls = [
    css.row,
    level === 1 ? css.lv1 : css.lv2,
    wave ? `${css.wave} wv${(wave - 1) % 4}` : "",
    className,
  ].join(" ");
  if (children == null)
    return (
      <div className={cls}>
        <div className={css.head}>{body}</div>
      </div>
    );
  return (
    <div className={cls}>
      <button
        type="button"
        className={css.head}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {body}
      </button>
      {open && <div className={css.kids}>{children}</div>}
    </div>
  );
}
