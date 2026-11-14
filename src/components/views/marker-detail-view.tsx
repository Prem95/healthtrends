import Link from "next/link";
import { ArrowLeft, Bookmark, BookmarkCheck, Plus, X } from "lucide-react";
import type { BiomarkerSummary } from "@/lib/analytics";
import { toggleWatch, deleteResult, setCustomRange } from "@/app/app/actions";
import { MarkerChart } from "@/components/charts/marker-chart";
import { UnitToggle } from "@/components/charts/unit-toggle";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SHORT_LABEL, StatusBadge, StatusGlyph } from "@/components/ui/status-badge";
import { Reveal } from "@/components/motion/reveal";
import { formatDate, prettyUnit } from "@/lib/utils";
import type { ViewCtx } from "@/lib/view-context";
import {
  CATEGORY_LABEL,
  conversionFactor,
  formatDelta,
  formatInUnit,
  formatMeasured,
  rangeInUnit,
  resolveDisplayUnit,
  type Biomarker,
  type LifeEvent,
  type Profile,
  type RefRange,
} from "@/lib/domain";

/*
  One marker, start to finish: the reading and its line across the years, then
  the same data as a table, then the range it is judged against.
*/

// Formats a range whose bounds are already in the display unit.
function fmtRange(r: RefRange | null | undefined): string {
  if (!r || (r.min == null && r.max == null)) return "—";
  if (r.min != null && r.max != null) return `${formatMeasured(r.min)}–${formatMeasured(r.max)}`;
  if (r.max != null) return `under ${formatMeasured(r.max)}`;
  return `over ${formatMeasured(r.min!)}`;
}

export function MarkerDetailView({
  ctx,
  profile,
  biomarker,
  summary: s,
  events,
  isWatched,
  unitPref,
  customRange,
  error,
}: {
  ctx: ViewCtx;
  profile: Profile;
  biomarker: Biomarker;
  summary: BiomarkerSummary;
  events: LifeEvent[];
  isWatched: boolean;
  unitPref?: string;
  customRange: RefRange | null;
  error?: string;
}) {
  // Values are stored canonical; render them in the chosen unit.
  const displayUnit = resolveDisplayUnit(biomarker, unitPref);
  const displayFactor = conversionFactor(biomarker, displayUnit) ?? 1;
  const unitLabel = prettyUnit(displayUnit);
  const unitOptions = [biomarker.canonicalUnit, ...biomarker.altUnits.map((u) => u.unit)];
  const customRangeDisplay = rangeInUnit(biomarker, customRange, displayUnit);
  const bandDisplay = rangeInUnit(biomarker, s.bandRange, displayUnit);

  const chrono = s.points;
  const history = [...chrono].reverse(); // newest first
  // Short aliases are abbreviations as printed on reports (LDL-C, A1C, TSH).
  const aliases = biomarker.aliases
    .slice(0, 2)
    .map((a) => (a.length <= 6 && !a.includes(" ") ? a.toUpperCase() : a));

  return (
    <div className="space-y-6">
      <Reveal>
        <Link
          href={`${ctx.base}/biomarkers`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors duration-300 hover:text-brand"
        >
          <ArrowLeft className="size-4" aria-hidden /> Markers
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="display text-[1.75rem] text-ink sm:text-[2rem]">{biomarker.name}</h1>
            <p className="mt-1.5 text-sm text-ink-3">
              {CATEGORY_LABEL[biomarker.category]}
              {aliases.length > 0 && <> · also printed as {aliases.join(", ")}</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unitOptions.length > 1 && (
              <UnitToggle
                biomarkerId={biomarker.id}
                units={unitOptions}
                active={displayUnit}
                linkBase={ctx.readOnly ? `${ctx.base}/biomarkers/${biomarker.id}` : undefined}
              />
            )}
            {!ctx.readOnly && (
              <form action={toggleWatch}>
                <input type="hidden" name="profileId" value={profile.id} />
                <input type="hidden" name="biomarkerId" value={biomarker.id} />
                <input type="hidden" name="watched" value={String(isWatched)} />
                <Button type="submit" variant={isWatched ? "subtle" : "secondary"} size="md">
                  {isWatched ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
                  {isWatched ? "Watching" : "Watch"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </Reveal>

      {s.points.length > 0 ? (
        <Reveal delay={60} className="card p-5 sm:p-7">
          <MarkerChart
            name={biomarker.name}
            unit={displayUnit}
            displayFactor={displayFactor}
            points={s.points}
            bandRange={s.bandRange}
            sexBands={s.sexBands}
            events={events}
          />
        </Reveal>
      ) : (
        <Reveal delay={60} className="card px-6 py-14 text-center">
          <p className="text-ink-2">No results recorded for {profile.name} yet.</p>
          {!ctx.readOnly && (
            <Button asChild variant="secondary" className="mt-5">
              <Link href="/app/sessions/new">
                <Plus aria-hidden /> Add results
              </Link>
            </Button>
          )}
        </Reveal>
      )}

      {s.ambiguousSex && (
        <p className="card-inset px-4 py-3 text-sm leading-relaxed text-ink-2">
          The typical range for this marker differs by sex, and this profile is set to Other.
          Both bands are drawn faintly, and a result is only judged when the range from your
          own lab report is entered with it.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* History: the chart as a table */}
        {history.length > 0 && (
          <Reveal as="section" delay={120} className="card overflow-hidden">
            <h2 className="px-5 pb-3 pt-5 text-base font-medium text-ink">
              History <span className="ml-1 font-normal text-ink-3 tnum">{history.length}</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-line bg-paper-2 text-left text-xs text-ink-3">
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Result</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Change</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">Reference</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    {!ctx.readOnly && <th className="w-10 px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((p) => {
                    const idx = chrono.findIndex((c) => c.resultId === p.resultId);
                    const prev = idx > 0 ? chrono[idx - 1] : null;
                    const delta = prev ? p.value - prev.value : null;
                    return (
                      <tr key={p.resultId}>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-2 tnum">
                          {formatDate(p.date)}
                          {p.labName && (
                            <span className="block text-xs text-ink-3">{p.labName}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-ink tnum">
                          {formatInUnit(biomarker, p.value, displayUnit)}{" "}
                          <span className="unit font-normal">{unitLabel}</span>
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3 text-ink-2 tnum sm:table-cell">
                          {delta == null
                            ? "—"
                            : `${delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} ${formatDelta(delta / displayFactor, p.value / displayFactor)}`}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3 text-ink-3 tnum sm:table-cell">
                          {fmtRange(rangeInUnit(biomarker, p.appliedRange, displayUnit))}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={p.status} className="hidden sm:inline-flex" />
                          <span className="inline-flex items-center gap-1.5 text-xs text-ink-2 sm:hidden">
                            <StatusGlyph status={p.status} />
                            {SHORT_LABEL[p.status].replace("Borderline ", "Near ")}
                          </span>
                        </td>
                        {!ctx.readOnly && (
                          <td className="px-3 py-3 text-right">
                            <form action={deleteResult}>
                              <input type="hidden" name="id" value={p.resultId} />
                              <button
                                type="submit"
                                className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-3 transition-colors duration-300 hover:bg-out-soft hover:text-out-ink"
                                aria-label={`Delete result from ${formatDate(p.date)}`}
                              >
                                <X className="size-4" aria-hidden />
                              </button>
                            </form>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}

        {/* Reference range */}
        <Reveal as="section" delay={160} className="card p-5">
          <h2 className="text-base font-medium text-ink">Reference range</h2>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-medium tracking-[-0.02em] text-ink">
              {fmtRange(bandDisplay)}
            </span>
            {bandDisplay && <span className="unit">{unitLabel}</span>}
          </p>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">
            {customRange ? "Using the range you set for this marker. " : ""}
            A range printed on a specific report always wins for that result, then your own
            range, then the catalog default.
          </p>

          {!ctx.readOnly && (
            <form action={setCustomRange} className="mt-5 border-t border-line pt-5">
              <input type="hidden" name="profileId" value={profile.id} />
              <input type="hidden" name="biomarkerId" value={biomarker.id} />
              <input type="hidden" name="unit" value={displayUnit} />
              <p className="text-[0.8125rem] font-medium text-ink">Set your own range</p>
              {error === "range_order" && (
                <p className="mt-2 rounded-lg bg-out-soft px-3 py-2 text-[0.8125rem] text-out-ink">
                  The minimum must be less than or equal to the maximum.
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cr-min">Min ({unitLabel})</Label>
                  <Input
                    id="cr-min"
                    name="min"
                    inputMode="decimal"
                    defaultValue={
                      customRangeDisplay?.min != null ? formatMeasured(customRangeDisplay.min) : ""
                    }
                    placeholder="optional"
                    className="tnum"
                  />
                </div>
                <div>
                  <Label htmlFor="cr-max">Max ({unitLabel})</Label>
                  <Input
                    id="cr-max"
                    name="max"
                    inputMode="decimal"
                    defaultValue={
                      customRangeDisplay?.max != null ? formatMeasured(customRangeDisplay.max) : ""
                    }
                    placeholder="optional"
                    className="tnum"
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary" size="sm" className="mt-3">
                {customRange ? "Update range" : "Save range"}
              </Button>
              <p className="mt-3 text-xs text-ink-3">Leave both blank and save to clear it.</p>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  );
}
