import { cn } from "@/lib/utils";
import type { ResultStatus } from "@/lib/domain";
import { statusTone } from "@/lib/domain";

/*
  A calm, data-bearing status visual: a hairline track with the normal-range
  band shaded, and a single status-coloured dot at the value's position. It
  answers "where does this sit, and how far out?" at a glance — far more
  informative than a repeated status pill, and it echoes the landing's shaded
  reference band. Colour stays reserved for data.
*/

const DOT_TONE: Record<string, string> = {
  "in-range": "bg-in-range",
  borderline: "bg-borderline",
  out: "bg-out",
  neutral: "bg-neutral-status",
};

export function RangeBar({
  value,
  min,
  max,
  status,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  status: ResultStatus;
  className?: string;
}) {
  const hasMin = typeof min === "number";
  const hasMax = typeof max === "number";
  // Nothing to anchor against — the caller falls back to no bar.
  if (!hasMin && !hasMax) return null;

  // Build an axis that comfortably frames the band and keeps the value visible.
  let ax0: number;
  let ax1: number;
  let bandL: number;
  let bandR: number;
  if (hasMin && hasMax) {
    const span = max! - min! || Math.abs(max!) || 1;
    ax0 = min! - span * 0.6;
    ax1 = max! + span * 0.6;
    bandL = min!;
    bandR = max!;
  } else if (hasMax) {
    ax0 = 0;
    ax1 = max! * 1.8 || 1;
    bandL = 0;
    bandR = max!;
  } else {
    const span = Math.abs(min!) || 1;
    ax0 = Math.max(0, min! - span * 1.2);
    ax1 = min! + span * 1.2;
    bandL = min!;
    bandR = ax1;
  }

  // Widen the axis if the value falls outside it, so the dot never clips.
  const rawSpan = ax1 - ax0 || 1;
  ax0 = Math.min(ax0, value - rawSpan * 0.06);
  ax1 = Math.max(ax1, value + rawSpan * 0.06);

  const span = ax1 - ax0 || 1;
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - ax0) / span) * 100));
  const left = pos(bandL);
  const right = pos(bandR);
  const dot = pos(value);
  const tone = statusTone(status);

  return (
    <div
      className={cn("relative h-1.5 w-full rounded-full bg-paper-3", className)}
      aria-hidden
    >
      <div
        className="absolute inset-y-0 rounded-full bg-in-range-soft"
        style={{ left: `${left}%`, right: `${100 - right}%` }}
      />
      <div
        className={cn(
          "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-paper",
          DOT_TONE[tone],
        )}
        style={{ left: `${dot}%` }}
      />
    </div>
  );
}
