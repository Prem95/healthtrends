import { cn } from "@/lib/utils";
import type { MarkerDigest } from "@/lib/digest";
import { countStatuses } from "@/components/markers/status-summary";
import { StatusGlyph } from "@/components/ui/status-badge";
import { CountUp } from "@/components/motion/count-up";

/*
  "How am I doing?" as one ring: the profile's markers on their latest test,
  split by status. It is a proportion, not a score — the figure in the middle
  is a count ("17 of 22 in range"), and the ring's segments are labelled
  beside it with their shapes. Segments draw round once in view (.m-arc).
*/

const R = 52;
const C = 2 * Math.PI * R;
const GAP = 3.2; // surface gap between segments, in path units

export function InRangeRing({
  digests,
  size = 176,
  className,
  legend = true,
}: {
  digests: MarkerDigest[];
  size?: number;
  className?: string;
  legend?: boolean;
}) {
  const c = countStatuses(digests);
  const parts = [
    { key: "in", n: c.inRange, color: "var(--in-range)", label: "In range", status: "IN_RANGE" as const },
    { key: "bl", n: c.borderline, color: "var(--borderline)", label: "Borderline", status: "BORDERLINE_HIGH" as const },
    { key: "out", n: c.out, color: "var(--out)", label: "Out of range", status: "HIGH" as const },
    { key: "nr", n: c.noRange, color: "var(--neutral-status)", label: "No range", status: "NO_RANGE" as const },
  ].filter((p) => p.n > 0);

  let start = 0;
  const arcs = parts.map((p, i) => {
    const len = Math.max(0, (p.n / c.total) * C - GAP);
    const arc = { ...p, len, offset: start, delay: 150 + i * 220 };
    start += (p.n / c.total) * C;
    return arc;
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-x-8 gap-y-6", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 120 120"
          className="size-full -rotate-90"
          role="img"
          aria-label={parts.map((p) => `${p.n} ${p.label.toLowerCase()}`).join(", ")}
        >
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--paper-2)" strokeWidth="9" />
          {arcs.map((a) => (
            <circle
              key={a.key}
              className="m-arc"
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth="9"
              strokeLinecap="butt"
              strokeDasharray={`${a.len} ${C}`}
              transform={`rotate(${(a.offset / C) * 360} 60 60)`}
              style={{ "--len": a.len, "--d": `${a.delay}ms` } as React.CSSProperties}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="figure text-[3.25rem] text-ink">
            <CountUp value={c.inRange} />
          </p>
          <p className="mt-1 text-xs text-ink-3">of {c.total} in range</p>
        </div>
      </div>
      {legend && (
        <dl className="min-w-[10rem] flex-1 divide-y divide-line">
          {parts.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="flex items-center gap-2.5 text-sm text-ink-2">
                <StatusGlyph status={p.status} />
                {p.label}
              </dt>
              <dd className="text-sm font-medium text-ink tnum">{p.n}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
