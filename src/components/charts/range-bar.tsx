import { cn } from "@/lib/utils";
import type { ResultStatus } from "@/lib/domain";
import { formatMeasured, statusTone } from "@/lib/domain";

/*
  Where a value sits against its reference range: a thin track, the range
  shaded as a band, one status-coloured dot for the value. It answers "inside
  or outside, and by how much?" before any number is read. With `labels`, the
  range limits are printed under the band's edges.
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
  labels = false,
  displayFactor = 1,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  status: ResultStatus;
  /** Print the range limits beneath the band. */
  labels?: boolean;
  /** Divide canonical bounds by this for the printed labels. */
  displayFactor?: number;
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
  const dot = Math.max(2, Math.min(98, pos(value)));
  const tone = statusTone(status);
  const fmt = (v: number) => formatMeasured(v / displayFactor);

  return (
    <div className={cn("w-full", className)} aria-hidden>
      <div className="relative h-1.5 w-full rounded-full bg-paper-3">
        <div
          className="rb-band absolute inset-y-0 rounded-full bg-in-range/30"
          style={{ left: `${left}%`, right: `${100 - right}%` }}
        />
        <div
          className={cn(
            "rb-dot absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-paper transition-[left] duration-300",
            DOT_TONE[tone],
          )}
          style={{ left: `${dot}%` }}
        />
      </div>
      {labels && (
        <div className="relative mt-1.5 h-4 text-[0.6875rem] text-ink-3 tnum">
          {hasMin && (
            <span className="absolute -translate-x-1/2" style={{ left: `${left}%` }}>
              {fmt(min!)}
            </span>
          )}
          {hasMax && (
            <span className="absolute -translate-x-1/2" style={{ left: `${right}%` }}>
              {fmt(max!)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
