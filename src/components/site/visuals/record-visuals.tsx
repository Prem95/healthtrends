import { cn, formatDate } from "@/lib/utils";
import type { MarkerDigest } from "@/lib/digest";
import { CATEGORY_LABEL, type BiomarkerCategory } from "@/lib/domain";
import { StatusBadge, StatusGlyph, TONE_VAR } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { statusTone } from "@/lib/domain";

/*
  Smaller product pictures for the landing page, all drawn from the sample
  profile: the one-page doctor summary, the family profiles list and the
  index of every marker the catalog knows.
*/

/** The printed doctor summary, as a sheet of paper. */
export function SummarySheet({
  name,
  date,
  flagged,
  className,
}: {
  name: string;
  date: string;
  flagged: MarkerDigest[];
  className?: string;
}) {
  return (
    <div className={cn("panel relative mx-auto w-full max-w-[30rem] px-6 pb-7 pt-6 sm:px-8 sm:pt-8", className)}>
      <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="text-xs text-ink-3">Doctor summary</p>
          <p className="display mt-1 text-[1.625rem] leading-tight text-ink">{name}</p>
        </div>
        <p className="pt-1 text-right text-xs text-ink-3">
          Latest test
          <span className="mt-0.5 block text-sm text-ink tnum">{formatDate(date)}</span>
        </p>
      </div>
      <p className="mt-5 text-xs font-medium text-ink-2">Worth discussing</p>
      <ul className="mt-2 divide-y divide-line border-y border-line">
        {flagged.map((m, i) => (
          <li
            key={m.id}
            className="m-item grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1fr)_72px_auto]"
            style={{ "--d": `${150 + i * 130}ms` } as React.CSSProperties}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{m.name}</span>
              <span className="text-sm text-ink-2 tnum">
                {m.valueLabel} <span className="unit">{m.unit}</span>
              </span>
            </span>
            <span className="hidden sm:block">
              <Sparkline values={m.spark} tone={TONE_VAR[statusTone(m.status)]} width={72} height={26} />
            </span>
            <StatusBadge status={m.status} />
          </li>
        ))}
      </ul>
      <div className="mt-5 space-y-2" aria-hidden>
        <div className="h-1.5 w-full rounded-full bg-paper-2" />
        <div className="h-1.5 w-4/5 rounded-full bg-paper-2" />
        <div className="h-1.5 w-3/5 rounded-full bg-paper-2" />
      </div>
      <p className="mt-6 text-[0.6875rem] leading-snug text-ink-3">
        A record, not a diagnosis. Prints as plain ink on paper.
      </p>
    </div>
  );
}

/** Everyone on one account: a profile per person, each with its own record. */
export function ProfileList({
  people,
  className,
}: {
  people: { name: string; meta: string; status: MarkerDigest["status"]; note: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("panel divide-y divide-line overflow-hidden", className)}>
      {people.map((p, i) => (
        <li
          key={p.name}
          className="m-item flex items-center gap-4 px-5 py-4 sm:px-6"
          style={{ "--d": `${i * 140}ms` } as React.CSSProperties}
        >
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full text-sm font-medium",
              i === 0 ? "bg-ink text-page" : "bg-paper-2 text-ink-2",
            )}
            aria-hidden
          >
            {p.name.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-medium text-ink">{p.name}</span>
            <span className="block truncate text-sm text-ink-3">{p.meta}</span>
          </span>
          <span className="hidden items-center gap-2 text-sm text-ink-2 sm:flex">
            <StatusGlyph status={p.status} />
            {p.note}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The catalog as a book index: every body system, every marker in it. */
export function MarkerIndex({
  groups,
  className,
}: {
  groups: { category: BiomarkerCategory; names: string[] }[];
  className?: string;
}) {
  return (
    <div className={cn("columns-1 gap-x-[var(--gutter)] sm:columns-2 lg:columns-4", className)}>
      {groups.map((g) => (
        <section key={g.category} className="mb-9 break-inside-avoid">
          <h3 className="flex items-baseline justify-between gap-3 border-b border-line-strong pb-2">
            <span className="text-[0.9375rem] font-medium text-ink">{CATEGORY_LABEL[g.category]}</span>
            <span className="text-xs text-ink-3 tnum">{g.names.length}</span>
          </h3>
          <ul className="mt-3 space-y-1.5">
            {g.names.map((n) => (
              <li key={n} className="text-sm leading-snug text-ink-2">
                {n}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
