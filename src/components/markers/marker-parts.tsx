import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { CATEGORY_LABEL, statusTone } from "@/lib/domain";
import type { MarkerDigest } from "@/lib/digest";
import { StatusBadge, TONE_VAR, Badge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { RangeBar } from "@/components/charts/range-bar";

/*
  The two ways a marker appears in a list. A card when it deserves a closer
  look (reading, where it sits in its range, the recent shape, what changed);
  a row when it is one of many. Neither is a client component, so both render
  on the server and inside client lists alike.
*/

export function MarkerCard({
  d,
  href,
  className,
}: {
  d: MarkerDigest;
  href: string;
  /** e.g. "glass" to float the card over artwork. */
  className?: string;
}) {
  return (
    <Link href={href} className={cn("card row-link group flex h-full flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="row-title truncate text-[0.9375rem] font-medium text-ink">{d.name}</p>
          <p className="mt-0.5 text-xs text-ink-3">{CATEGORY_LABEL[d.category]}</p>
        </div>
        <StatusBadge status={d.status} className="shrink-0" />
      </div>

      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[2rem] font-medium leading-none tracking-[-0.03em] text-ink">
            {d.valueLabel}
          </span>
          <span className="unit">{d.unit}</span>
        </p>
        <Sparkline values={d.spark} tone={TONE_VAR[statusTone(d.status)]} width={104} height={32} />
      </div>

      {d.value != null && (
        <RangeBar
          value={d.value}
          min={d.rangeMin}
          max={d.rangeMax}
          status={d.status}
          displayFactor={d.displayFactor}
          labels
        />
      )}

      <p className="text-xs text-ink-3">
        {d.deltaLabel && d.prevDate ? (
          <>
            <span className="tnum font-medium text-ink-2">
              {d.deltaLabel} {d.unit}
            </span>{" "}
            since {formatDate(d.prevDate)}
          </>
        ) : d.prevDate ? (
          <>Unchanged since {formatDate(d.prevDate)}</>
        ) : (
          <>First result {d.date ? formatDate(d.date) : ""}</>
        )}
        <span> · {d.count} result{d.count === 1 ? "" : "s"}</span>
      </p>
    </Link>
  );
}

export function MarkerRow({
  d,
  href,
  showRange = true,
  className,
}: {
  d: MarkerDigest;
  href: string;
  showRange?: boolean;
  className?: string;
}) {
  const hasValue = d.value != null;
  return (
    <Link
      href={href}
      className={cn(
        "row-link grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 px-5 py-3.5",
        showRange
          ? "sm:grid-cols-[minmax(0,1.3fr)_76px_8.25rem_minmax(0,1fr)_8.75rem]"
          : "sm:grid-cols-[minmax(0,1.3fr)_76px_8.25rem_8.75rem]",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="row-title flex items-center gap-2 truncate text-[0.9375rem] font-medium text-ink">
          <span className="truncate">{d.name}</span>
          {d.isCustom && <Badge tone="brand">Custom</Badge>}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-3">
          {hasValue && d.date
            ? `${formatDate(d.date)} · ${d.count} result${d.count === 1 ? "" : "s"}`
            : "No results yet"}
        </p>
      </div>

      <div className="hidden sm:block">
        {d.spark.length >= 2 && (
          <Sparkline values={d.spark} tone={TONE_VAR[statusTone(d.status)]} />
        )}
      </div>

      {hasValue ? (
        <p className="hidden items-baseline gap-1.5 justify-self-end sm:flex">
          <span className="tnum text-[0.9375rem] font-medium text-ink">{d.valueLabel}</span>
          <span className="unit">{d.unit}</span>
        </p>
      ) : (
        <span className="hidden sm:block" />
      )}

      {showRange && (
        <div className="hidden sm:block">
          {hasValue && (
            <RangeBar
              value={d.value!}
              min={d.rangeMin}
              max={d.rangeMax}
              status={d.status}
              className="max-w-44"
            />
          )}
        </div>
      )}

      <div className="flex flex-col items-end gap-1 justify-self-end sm:items-start sm:justify-self-start">
        {hasValue ? (
          <>
            <StatusBadge status={d.status} />
            <p className="flex items-baseline gap-1 sm:hidden">
              <span className="tnum text-sm font-medium text-ink">{d.valueLabel}</span>
              <span className="unit">{d.unit}</span>
            </p>
          </>
        ) : (
          <span className="text-xs text-ink-3">Add a result →</span>
        )}
      </div>
    </Link>
  );
}

/** A list of rows inside one card, hairline between rows. */
export function MarkerList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("card divide-y divide-line overflow-hidden", className)}>{children}</div>
  );
}

/** Section heading used across app screens: title, optional count, optional action. */
export function SectionHeading({
  title,
  count,
  action,
  id,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-base font-medium text-ink">
        {title}
        {count != null && <span className="ml-2 font-normal text-ink-3 tnum">{count}</span>}
      </h2>
      {action}
    </div>
  );
}
