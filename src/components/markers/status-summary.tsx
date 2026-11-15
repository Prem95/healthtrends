import { cn } from "@/lib/utils";
import { statusTone, type ResultStatus } from "@/lib/domain";
import type { MarkerDigest } from "@/lib/digest";
import { StatusGlyph } from "@/components/ui/status-badge";
import { CountUp } from "@/components/motion/count-up";

/*
  The headline read of a profile: how many markers are in range on their
  latest test, as one figure, one thin proportional bar and three tallies.
*/

export function countStatuses(digests: MarkerDigest[]) {
  return {
    total: digests.length,
    inRange: digests.filter((d) => d.status === "IN_RANGE").length,
    borderline: digests.filter((d) => statusTone(d.status) === "borderline").length,
    out: digests.filter((d) => statusTone(d.status) === "out").length,
    noRange: digests.filter((d) => d.status === "NO_RANGE").length,
  };
}

export function StatusSummary({
  digests,
  className,
  countUp = false,
}: {
  digests: MarkerDigest[];
  className?: string;
  /** Count the headline figure up when it comes into view (landing page). */
  countUp?: boolean;
}) {
  const c = countStatuses(digests);
  const parts = [
    { n: c.inRange, color: "var(--in-range)", label: "in range" },
    { n: c.borderline, color: "var(--borderline)", label: "borderline" },
    { n: c.out, color: "var(--out)", label: "out of range" },
    { n: c.noRange, color: "var(--neutral-status)", label: "no reference range" },
  ].filter((p) => p.n > 0);

  return (
    <div className={cn("card-wash @container p-6 sm:p-7", className)}>
      <p className="text-sm text-ink-3">Latest result for each marker</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[3.25rem] font-medium leading-none tracking-[-0.035em] text-ink">
          {countUp ? <CountUp value={c.inRange} /> : c.inRange}
        </span>
        <span className="text-lg text-ink-2">
          of {c.total} marker{c.total === 1 ? "" : "s"} in range
        </span>
      </p>

      {/* One whole, split into parts: thin segments with surface gaps */}
      <div
        role="img"
        aria-label={parts.map((p) => `${p.n} ${p.label}`).join(", ")}
        className="mt-6 flex h-2 w-full gap-[2px]"
      >
        {parts.map((p) => (
          <span
            key={p.label}
            className="ss-seg h-full rounded-full"
            style={{ flexGrow: p.n, flexBasis: 0, background: p.color }}
          />
        ))}
      </div>

      <dl className="mt-4 divide-y divide-line @sm:mt-5 @sm:grid @sm:grid-cols-3 @sm:gap-x-4 @sm:divide-y-0">
        <Tally status="IN_RANGE" label="In range" n={c.inRange} />
        <Tally status="BORDERLINE_HIGH" label="Borderline" n={c.borderline} />
        <Tally status="HIGH" label="Out of range" n={c.out} />
      </dl>
      {c.noRange > 0 && (
        <p className="mt-4 text-xs text-ink-3">
          {c.noRange} marker{c.noRange === 1 ? " has" : "s have"} no reference range yet, so{" "}
          {c.noRange === 1 ? "it is" : "they are"} tracked but not judged.
        </p>
      )}
    </div>
  );
}

function Tally({ status, label, n }: { status: ResultStatus; label: string; n: number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 @sm:block @sm:py-0">
      <dt className="flex items-center gap-2 whitespace-nowrap text-sm text-ink-2">
        <StatusGlyph status={status} />
        {label}
      </dt>
      <dd className="text-lg font-medium text-ink @sm:mt-1 @sm:text-2xl">{n}</dd>
    </div>
  );
}
