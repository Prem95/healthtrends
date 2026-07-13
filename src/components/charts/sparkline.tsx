/**
 * Data-bearing mini trend for markers with ≥2 values (never decoration).
 * Stroke colour carries the marker's status; inside a Reveal the line draws
 * left→right via the shared .draw-line hook.
 */
export function Sparkline({
  values,
  stroke = "var(--ink-3)",
  draw = false,
  className,
}: {
  values: number[];
  /** CSS colour — pass the status token, e.g. "var(--out)". */
  stroke?: string;
  /** Draw on when an ancestor Reveal adds .inview. */
  draw?: boolean;
  className?: string;
}) {
  const w = 64;
  const h = 22;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={draw ? "draw-line" : undefined}
      />
    </svg>
  );
}
