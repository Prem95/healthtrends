import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getActiveProfile,
  getBiomarker,
  getCustomRanges,
  getLifeEvents,
  getResults,
  getUnitPreferences,
  getWatched,
} from "@/lib/data";
import { summarize, type BiomarkerSummary } from "@/lib/analytics";
import { toggleWatch, deleteResult, setCustomRange } from "@/app/app/actions";
import { MarkerChart } from "@/components/charts/marker-chart";
import { UnitToggle } from "@/components/charts/unit-toggle";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Reveal } from "@/components/motion/reveal";
import { formatDate } from "@/lib/utils";
import {
  conversionFactor,
  formatInUnit,
  formatMeasured,
  rangeInUnit,
  resolveDisplayUnit,
  statusTone,
  type RefRange,
} from "@/lib/domain";

/*
  Marker detail, per the handoff's hero screen: the reading block and the
  years-long line live in MarkerChart (client, scrubbable); below it the
  tap-through history rows.
*/

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function monthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} '${String(y).slice(2)}`;
}

// Formats a range whose bounds are already in the display unit.
function fmtRange(r: RefRange | null | undefined): string {
  if (!r || (r.min == null && r.max == null)) return "n/a";
  if (r.min != null && r.max != null) return `${formatMeasured(r.min)}–${formatMeasured(r.max)}`;
  if (r.max != null) return `< ${formatMeasured(r.max)}`;
  return `> ${formatMeasured(r.min!)}`;
}

export default async function BiomarkerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = (await getActiveProfile())!;
  const [biomarker, results, events, watched, unitPrefs, customRanges] = await Promise.all([
    getBiomarker(id),
    getResults(profile.id),
    getLifeEvents(profile.id),
    getWatched(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);
  if (!biomarker) notFound();

  // Values are stored canonical; render them in the user's chosen unit.
  const displayUnit = resolveDisplayUnit(biomarker, unitPrefs[biomarker.id]);
  const displayFactor = conversionFactor(biomarker, displayUnit) ?? 1;
  const unitOptions = [biomarker.canonicalUnit, ...biomarker.altUnits.map((u) => u.unit)];

  const customRange = customRanges[biomarker.id] ?? null;
  const customRangeDisplay = rangeInUnit(biomarker, customRange, displayUnit);

  const summaries = summarize(
    results.filter((r) => r.biomarkerId === id),
    [biomarker],
    profile.sex,
    customRanges,
  );
  const s: BiomarkerSummary = summaries[0] ?? {
    biomarker,
    points: [],
    latest: null,
    latestStatus: "NO_RANGE" as const,
    trend: { direction: "INSUFFICIENT_DATA" as const, latest: null, previous: null, deltaAbs: null, deltaPct: null, count: 0 },
    bandRange: null,
    ambiguousSex: false,
    sexBands: undefined,
  };

  const isWatched = watched.includes(id);
  const history = [...s.points].reverse(); // newest first
  const chrono = s.points;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <Reveal className="flex items-center justify-between gap-3">
        <Link
          href="/app/biomarkers"
          className="au-mono text-[12px] text-ink-3 transition-colors duration-300 hover:text-brand"
        >
          ← All markers
        </Link>
        <form action={toggleWatch}>
          <input type="hidden" name="profileId" value={profile.id} />
          <input type="hidden" name="biomarkerId" value={id} />
          <input type="hidden" name="watched" value={String(isWatched)} />
          <Button type="submit" variant={isWatched ? "subtle" : "secondary"} size="sm">
            {isWatched ? "Watching ×" : "＋ Watch"}
          </Button>
        </form>
      </Reveal>

      {unitOptions.length > 1 && (
        <Reveal className="flex items-center justify-between gap-3">
          <span className="au-mono text-[11px] text-ink-3">Display unit</span>
          <UnitToggle biomarkerId={biomarker.id} units={unitOptions} active={displayUnit} />
        </Reveal>
      )}

      {s.points.length > 0 ? (
        <MarkerChart
          name={biomarker.name}
          unit={displayUnit}
          displayFactor={displayFactor}
          points={s.points}
          bandRange={s.bandRange}
          sexBands={s.sexBands}
          events={events}
        />
      ) : (
        <Reveal>
          <p className="au-eyebrow">
            {biomarker.name} · {displayUnit}
          </p>
          <div className="au-card mt-6 px-6 py-12 text-center">
            <p className="text-ink-2">No values recorded for {profile.name} yet.</p>
            <Button asChild variant="secondary" size="sm" className="mt-4">
              <Link href="/app/sessions/new">＋ Add a test session</Link>
            </Button>
          </div>
        </Reveal>
      )}

      {s.ambiguousSex && (
        <Reveal>
          <p className="au-card px-4 py-3 text-sm leading-relaxed text-ink-2">
            The typical range for this marker differs by sex, and this profile is set to
            Other. Both bands are drawn faintly, and values are only flagged when the range
            from your own lab report is entered with a result.
          </p>
        </Reveal>
      )}

      <Reveal as="section">
        {error === "range_order" && (
          <p className="mb-3 rounded-[8px] border border-out/25 bg-out-soft px-3 py-2 text-sm text-out">
            The minimum must be less than or equal to the maximum.
          </p>
        )}
        <details className="au-acc au-card overflow-hidden rounded-xl" open={!!customRange}>
          <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
            <span className="au-acc-plus au-mono text-[14px] text-ink-3" aria-hidden>
              +
            </span>
            <span className="au-mono text-[12px] text-ink-2">
              Reference range{customRange ? " · custom" : ""}
            </span>
          </summary>
          <form action={setCustomRange} className="border-t border-line px-5 py-4">
            <input type="hidden" name="profileId" value={profile.id} />
            <input type="hidden" name="biomarkerId" value={biomarker.id} />
            <input type="hidden" name="unit" value={displayUnit} />
            <p className="au-mono mb-3 max-w-[560px] text-[10px] leading-relaxed text-ink-3">
              Set your own in-range band for this marker, in {displayUnit}. It overrides the
              catalog default; a range printed on a specific report still takes priority. Leave
              both blank and save to clear.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="cr-min">Min ({displayUnit})</Label>
                <Input
                  id="cr-min"
                  name="min"
                  inputMode="decimal"
                  defaultValue={
                    customRangeDisplay?.min != null ? formatMeasured(customRangeDisplay.min) : ""
                  }
                  placeholder="optional"
                  className="w-28 tnum"
                />
              </div>
              <div>
                <Label htmlFor="cr-max">Max ({displayUnit})</Label>
                <Input
                  id="cr-max"
                  name="max"
                  inputMode="decimal"
                  defaultValue={
                    customRangeDisplay?.max != null ? formatMeasured(customRangeDisplay.max) : ""
                  }
                  placeholder="optional"
                  className="w-28 tnum"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                {customRange ? "Update range" : "Save range"}
              </Button>
            </div>
          </form>
        </details>
      </Reveal>

      {history.length > 0 && (
        <Reveal as="section" delay={160}>
          <h2 className="au-eyebrow">History</h2>
          <ul className="mt-1">
            {history.map((p) => {
              const idx = chrono.findIndex((c) => c.resultId === p.resultId);
              const prev = idx > 0 ? chrono[idx - 1] : null;
              const delta = prev ? p.value - prev.value : null;
              const tone = statusTone(p.status);
              const deltaColor =
                tone === "out"
                  ? "text-out"
                  : tone === "borderline"
                    ? "text-borderline-ink"
                    : "text-ink-3";
              return (
                <li
                  key={p.resultId}
                  className="flex items-baseline gap-4 border-t border-line py-3.5"
                >
                  <span className="au-mono w-16 shrink-0 text-[11px] text-ink-3">
                    {monthYear(p.date)}
                  </span>
                  <span className="tnum min-w-0 flex-1 text-[14px] text-ink">
                    {formatInUnit(biomarker, p.value, displayUnit)} {displayUnit}
                    {p.enteredUnit !== displayUnit && (
                      <span className="ml-1.5 text-xs text-ink-3">
                        entered in {p.enteredUnit}
                      </span>
                    )}
                  </span>
                  <span className="au-mono hidden text-[11px] text-ink-3 sm:inline">
                    range {fmtRange(rangeInUnit(biomarker, p.appliedRange, displayUnit))}
                    {p.labName ? ` · ${p.labName}` : ""}
                  </span>
                  {delta != null && (
                    <span className={`au-num shrink-0 text-[12px] ${deltaColor}`}>
                      {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {formatMeasured(Math.abs(delta) / displayFactor)}
                    </span>
                  )}
                  <form action={deleteResult} className="shrink-0">
                    <input type="hidden" name="id" value={p.resultId} />
                    <button
                      type="submit"
                      className="au-mono cursor-pointer text-[11px] text-ink-3 transition-colors duration-300 hover:text-out"
                      aria-label={`Delete result from ${formatDate(p.date)}`}
                    >
                      ×
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Reveal>
      )}
    </div>
  );
}
