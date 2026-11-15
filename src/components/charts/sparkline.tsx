/**
 * Mini trend for markers with ≥2 values. The line stays in a quiet neutral so
 * a list of them reads as texture; only the latest point wears the marker's
 * status colour (ringed in the surface so it stays legible on the line).
 */
export function Sparkline({
  values,
  tone = "var(--neutral-status)",
  width = 76,
  height = 26,
  className,
}: {
  values: number[];
  /** CSS colour for the latest point — pass the status token. */
  tone?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polyline
        className="spark-line"
        pathLength={1}
        points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="var(--neutral-status)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="spark-dot" cx={lx} cy={ly} r="4.5" fill={tone} stroke="var(--paper)" strokeWidth="2" />
    </svg>
  );
}
