import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getActiveProfile,
  getBiomarker,
  getLifeEvents,
  getResults,
  getWatched,
} from "@/lib/data";
import { summarize, type BiomarkerSummary } from "@/lib/analytics";
import { toggleWatch, deleteResult } from "@/app/app/actions";
import { MarkerChart } from "@/components/charts/marker-chart";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { formatDate, formatNumber } from "@/lib/utils";
import { statusTone, type RefRange } from "@/lib/domain";

/*
  Marker detail, per the handoff's hero screen: the reading block and the
  years-long line live in MarkerChart (client, scrubbable); below it a
  plain-language trend note and the tap-through history rows.
*/

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function monthYear(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} '${String(y).slice(2)}`;
}

function fmtRange(r: RefRange | null | undefined): string {
  if (!r || (r.min == null && r.max == null)) return "n/a";
  if (r.min != null && r.max != null) return `${formatNumber(r.min)}–${formatNumber(r.max)}`;
  if (r.max != null) return `< ${formatNumber(r.max)}`;
  return `> ${formatNumber(r.min!)}`;
}

/* Declarative trend sentence: rate of change, threshold crossing, sources. */
function trendNote(s: BiomarkerSummary, unit: string): string | null {
  const pts = s.points;
  if (pts.length < 2) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const years =
    (Date.parse(last.date) - Date.parse(first.date)) / (365.25 * 24 * 3600 * 1000);
  const parts: string[] = [];

  if (years >= 0.5) {
    const perYear = (last.value - first.value) / years;
    const startYear = first.date.slice(0, 4);
    if (Math.abs(perYear) < Math.abs(last.value) * 0.02) {
      parts.push(`Stable around ${formatNumber((first.value + last.value) / 2)} ${unit} since ${startYear}.`);
    } else {
      parts.push(
        `${perYear > 0 ? "Rising" : "Falling"} ~${formatNumber(Math.abs(perYear), 1)} ${unit} per year since ${startYear}.`,
      );
    }
  }

  const firstOut = pts.find((p, i) => {
    const t = statusTone(p.status);
    if (t !== "out") return false;
    return i === 0 || statusTone(pts[i - 1].status) !== "out";
  });
  if (firstOut && statusTone(last.status) === "out") {
    const bound =
      firstOut.appliedRange?.max != null && firstOut.value > firstOut.appliedRange.max
        ? formatNumber(firstOut.appliedRange.max)
        : firstOut.appliedRange?.min != null
          ? formatNumber(firstOut.appliedRange.min)
          : null;
    parts.push(
      bound
        ? `Crossed the ${bound} threshold in ${firstOut.date.slice(0, 4)}.`
        : `Moved out of range in ${firstOut.date.slice(0, 4)}.`,
    );
  }

  const labs = new Set(pts.map((p) => p.labName).filter(Boolean)).size;
  parts.push(
    labs > 1
      ? `${pts.length} measurements from ${labs} labs, normalized.`
      : `${pts.length} measurement${pts.length === 1 ? "" : "s"}.`,
  );
  return parts.join(" ");
}

export default async function BiomarkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = (await getActiveProfile())!;
  const [biomarker, results, events, watched] = await Promise.all([
    getBiomarker(id),
    getResults(profile.id),
    getLifeEvents(profile.id),
    getWatched(profile.id),
  ]);
  if (!biomarker) notFound();

  const summaries = summarize(
    results.filter((r) => r.biomarkerId === id),
    [biomarker],
    profile.sex,
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
  const note = trendNote(s, biomarker.canonicalUnit);
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

      {s.points.length > 0 ? (
        <MarkerChart
          name={biomarker.name}
          unit={biomarker.canonicalUnit}
          points={s.points}
          bandRange={s.bandRange}
          sexBands={s.sexBands}
          events={events}
        />
      ) : (
        <Reveal>
          <p className="au-eyebrow">
            {biomarker.name} · {biomarker.canonicalUnit}
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

      {note && (
        <Reveal delay={120}>
          <div className="au-card rounded-xl bg-paper-2 px-5 py-4">
            <p className="au-eyebrow text-brand">Trend</p>
            <p className="mt-2 max-w-[640px] text-[13.5px] leading-relaxed text-ink-2">{note}</p>
          </div>
        </Reveal>
      )}

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
                    {formatNumber(p.value)} {biomarker.canonicalUnit}
                    {p.enteredUnit !== biomarker.canonicalUnit && (
                      <span className="ml-1.5 text-xs text-ink-3">
                        entered in {p.enteredUnit}
                      </span>
                    )}
                  </span>
                  <span className="au-mono hidden text-[11px] text-ink-3 sm:inline">
                    range {fmtRange(p.appliedRange)}
                    {p.labName ? ` · ${p.labName}` : ""}
                  </span>
                  {delta != null && (
                    <span className={`au-num shrink-0 text-[12px] ${deltaColor}`}>
                      {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {formatNumber(Math.abs(delta))}
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
