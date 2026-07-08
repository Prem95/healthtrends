import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  getActiveProfile,
  getBiomarker,
  getLifeEvents,
  getResults,
  getWatched,
} from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { toggleWatch, deleteResult } from "@/app/app/actions";
import { BiomarkerChart } from "@/components/charts/biomarker-chart";
import { StatusBadge, Badge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/utils";
import { TREND_LABEL, CATEGORY_LABEL, statusTone, type RefRange } from "@/lib/domain";

const TONE_TEXT: Record<string, string> = {
  "in-range": "text-in-range",
  borderline: "text-borderline",
  out: "text-out",
  neutral: "text-ink",
};

function fmtRange(r: RefRange | null | undefined): string {
  if (!r || (r.min == null && r.max == null)) return "n/a";
  if (r.min != null && r.max != null) return `${formatNumber(r.min)}–${formatNumber(r.max)}`;
  if (r.max != null) return `< ${formatNumber(r.max)}`;
  return `> ${formatNumber(r.min!)}`;
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
  const s = summaries[0] ?? {
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
  const values = s.points.map((p) => p.value);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

  return (
    <div className="animate-rise space-y-8">
      <div>
        <Link
          href="/app/biomarkers"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> All biomarkers
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="au-hl text-3xl text-ink">{biomarker.name}</h1>
            <Badge>{CATEGORY_LABEL[biomarker.category]}</Badge>
            {biomarker.isCustom && <Badge tone="brand">Custom</Badge>}
          </div>
          <form action={toggleWatch}>
            <input type="hidden" name="profileId" value={profile.id} />
            <input type="hidden" name="biomarkerId" value={id} />
            <input type="hidden" name="watched" value={String(isWatched)} />
            <Button type="submit" variant={isWatched ? "subtle" : "secondary"} size="sm">
              {isWatched ? <EyeOff /> : <Eye />}
              {isWatched ? "Watching" : "Watch"}
            </Button>
          </form>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 border-y border-line py-4">
        <Stat label="Latest">
          {s.latest ? (
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className={`font-display text-4xl leading-none tnum ${TONE_TEXT[statusTone(s.latestStatus)]}`}>
                {formatNumber(s.latest.value)}
              </span>
              <span className="text-sm text-ink-3">{biomarker.canonicalUnit}</span>
              <StatusBadge status={s.latestStatus} className="ml-1" />
            </span>
          ) : (
            <span className="text-ink-3">No results yet</span>
          )}
        </Stat>
        <Stat label="Change vs previous">
          {s.trend.deltaAbs != null ? (
            <span className="font-display text-2xl text-ink tnum">
              {s.trend.deltaAbs > 0 ? "+" : ""}
              {formatNumber(s.trend.deltaAbs)}
              {s.trend.deltaPct != null && (
                <span className="ml-1 text-sm text-ink-3 tnum">
                  ({s.trend.deltaPct > 0 ? "+" : ""}
                  {formatNumber(s.trend.deltaPct, 1)}%)
                </span>
              )}
            </span>
          ) : (
            <span className="text-ink-3">n/a</span>
          )}
        </Stat>
        <Stat label="Trend (last 3 tests)">
          <span className="font-display text-2xl text-ink">{TREND_LABEL[s.trend.direction]}</span>
        </Stat>
        <Stat label="Min / Avg / Max">
          <span className="font-display text-2xl text-ink tnum">
            {min != null ? formatNumber(min) : "n/a"}
            <span className="text-ink-3"> / </span>
            {avg != null ? formatNumber(avg) : "n/a"}
            <span className="text-ink-3"> / </span>
            {max != null ? formatNumber(max) : "n/a"}
          </span>
        </Stat>
      </div>

      {s.ambiguousSex && (
        <p className="rounded-md border border-line bg-paper-2 px-3 py-2 text-sm text-ink-2">
          The typical range for this marker differs by sex, and this profile is set to Other.
          Both bands are drawn faintly, and values are only flagged when the range from your
          own lab report is entered with a result.
        </p>
      )}

      {/* Chart */}
      {s.points.length > 0 ? (
        <BiomarkerChart
          points={s.points}
          bandRange={s.bandRange}
          sexBands={s.sexBands}
          events={events}
          unit={biomarker.canonicalUnit}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="text-ink-2">No values recorded for {profile.name} yet.</p>
          <Button asChild variant="subtle" size="sm" className="mt-3">
            <Link href="/app/sessions/new">Add a test session</Link>
          </Button>
        </div>
      )}

      {/* History table */}
      {s.points.length > 0 && (
        <section>
          <h2 className="microlabel rule-top pt-2">History</h2>

          {/* Mobile: stacked cards (a wide table would clip on a phone) */}
          <ul className="mt-3 space-y-2 md:hidden">
            {[...s.points].reverse().map((p) => (
              <li key={p.resultId} className="rounded-lg border border-line bg-paper p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{formatDate(p.date)}</span>
                  <StatusBadge status={p.status} />
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">Value</dt>
                    <dd className="tnum text-ink">
                      {formatNumber(p.value)} {biomarker.canonicalUnit}
                      {p.enteredUnit !== biomarker.canonicalUnit && (
                        <span className="ml-1 text-xs text-ink-3">(entered in {p.enteredUnit})</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">Range that applied</dt>
                    <dd className="tnum text-ink-2">{fmtRange(p.appliedRange)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-ink-3">Lab</dt>
                    <dd className="text-ink-2">{p.labName ?? "n/a"}</dd>
                  </div>
                </dl>
                <form action={deleteResult} className="mt-2 text-right">
                  <input type="hidden" name="id" value={p.resultId} />
                  <button
                    type="submit"
                    className="text-xs text-ink-3 hover:text-out"
                    aria-label={`Delete result from ${formatDate(p.date)}`}
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {/* Desktop: full table */}
          <div className="mt-3 hidden overflow-x-auto rounded-lg border border-line md:block">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left text-xs tracking-wide text-ink-3 uppercase">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Range that applied</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Lab</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...s.points].reverse().map((p) => (
                  <tr key={p.resultId} className="bg-paper">
                    <td className="px-4 py-2.5 text-ink">{formatDate(p.date)}</td>
                    <td className="px-4 py-2.5 tnum text-ink">
                      {formatNumber(p.value)} {biomarker.canonicalUnit}
                      {p.enteredUnit !== biomarker.canonicalUnit && (
                        <span className="ml-1 text-xs text-ink-3">
                          (entered in {p.enteredUnit})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tnum text-ink-2">{fmtRange(p.appliedRange)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-2.5 text-ink-3">{p.labName ?? "n/a"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={deleteResult}>
                        <input type="hidden" name="id" value={p.resultId} />
                        <button
                          type="submit"
                          className="text-xs text-ink-3 hover:text-out"
                          aria-label={`Delete result from ${formatDate(p.date)}`}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
