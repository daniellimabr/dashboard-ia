const W = 140;
const H = 36;

/** 7-day spend sparkline; fixed 140×36 so it never stretches. */
export function Spark({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 0.01);
  const step = W / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [Math.round(i * step), Math.round(H - 3 - (v / max) * (H - 8))]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const last = pts.at(-1) ?? [0, H];
  return (
    <svg
      className="spark"
      role="img"
      aria-label={label}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
    >
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="var(--accent)" fillOpacity=".12" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--accent)" />
    </svg>
  );
}
