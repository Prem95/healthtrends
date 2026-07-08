import Link from "next/link";
import { ArrowRight, ChevronRight, Plus } from "lucide-react";
import {
  getActiveProfile,
  getBiomarkers,
  getResults,
  getSessions,
  getWatched,
} from "@/lib/data";
import { summarize, isOutOfRange, isBorderline, type BiomarkerSummary } from "@/lib/analytics";
import { cn, formatDate, formatNumber, monthsSince } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { RangeBar } from "@/components/charts/range-bar";
import { TREND_LABEL, type BiomarkerCategory } from "@/lib/domain";
import { worstStatus, type RegionData } from "@/lib/body-map";
import { BodyMapView } from "@/components/body/body-map-view";

export default async function DashboardPage() {
  const profile = (await getActiveProfile())!;
  const [biomarkers, results, sessions, watched] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
    getSessions(profile.id),
    getWatched(profile.id),
  ]);

  const summaries = summarize(results, biomarkers, profile.sex);
  const byId = new Map(summaries.map((s) => [s.biomarker.id, s]));

  // Group latest results by body system for the body map section.
  const grouped = new Map<BiomarkerCategory, RegionData>();
  for (const s of summaries) {
    if (!s.latest) continue;
    const category = s.biomarker.category;
    if (!grouped.has(category)) {
      grouped.set(category, { category, worst: "NO_RANGE", markers: [] });
    }
    grouped.get(category)!.markers.push({
      id: s.biomarker.id,
      name: s.biomarker.name,
      value: s.latest.value,
      unit: s.biomarker.canonicalUnit,
      status: s.latestStatus,
    });
  }
  for (const region of grouped.values()) {
    region.worst = worstStatus(region.markers.map((m) => m.status));
  }
  const regions = [...grouped.values()];

  const watchedSummaries = watched
    .map((id) => byId.get(id))
    .filter((s): s is BiomarkerSummary => !!s);
  const inRangeCount = summaries.filter((s) => s.latest && s.latestStatus === "IN_RANGE").length;
  const outOfRange = summaries.filter((s) => isOutOfRange(s.latestStatus));
  const borderline = summaries.filter((s) => isBorderline(s.latestStatus));

  // Group every marker that has data by its body system, so a layperson meets a
  // handful of friendly systems instead of a wall of technical marker names.
  const bySystem = new Map<BiomarkerCategory, BiomarkerSummary[]>();
  for (const s of summaries) {
    if (!s.latest) continue;
    const list = bySystem.get(s.biomarker.category);
    if (list) list.push(s);
    else bySystem.set(s.biomarker.category, [s]);
  }
  const systemGroups: SystemGroup[] = [...bySystem.entries()]
    .map(([category, items]) => ({
      category,
      items: [...items].sort(
        (a, b) => severity(b) - severity(a) || outDistance(b) - outDistance(a),
      ),
      out: items.filter((s) => isOutOfRange(s.latestStatus)).length,
      near: items.filter((s) => isBorderline(s.latestStatus)).length,
      total: items.length,
    }))
    .sort(
      (a, b) =>
        groupRank(b) - groupRank(a) ||
        b.out - a.out ||
        b.near - a.near ||
        a.category.localeCompare(b.category),
    );

  const stale = summaries.filter((s) => s.latest && monthsSince(s.latest.date) > 12);
  const recentSession = sessions[0] ?? null;
  const recentResults = recentSession
    ? summaries
        .flatMap((s) =>
          s.points
            .filter((p) => p.sessionId === recentSession.id)
            .map((p) => ({ summary: s, point: p })),
        )
    : [];

  if (sessions.length === 0) {
    return <EmptyDashboard name={profile.name} />;
  }

  return (
    <div className="animate-rise space-y-10">
      {/* Header + the landing hero-card language: a white card with a
          hairline-divided stat strip, colour only on the numbers themselves. */}
      <header>
        <p className="au-eyebrow">Logbook · {profile.name}</p>
        <h1 className="au-hl mt-2 text-4xl text-ink">
          Where things stand <span className="em">today</span>
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-2">
          {standSummary(outOfRange.length, borderline.length, inRangeCount)}
        </p>
        <div className="au-card mt-6 max-w-2xl overflow-hidden">
          <dl className="grid grid-cols-3 divide-x divide-line">
            <Stat n={outOfRange.length} label="Out of range" color="text-out" />
            <Stat n={borderline.length} label="Near boundary" color="text-borderline" />
            <Stat n={inRangeCount} label="In range" color="text-in-range" />
          </dl>
          <p className="border-t border-line px-5 py-2.5 text-xs text-ink-3">
            {sessions.length} test{sessions.length === 1 ? "" : "s"} logged ·{" "}
            {summaries.length} markers tracked
            {recentSession && <> · latest {formatDate(recentSession.date)}</>}
          </p>
        </div>
      </header>

      {/* Watched markers pinned first */}
      {watchedSummaries.length > 0 && (
        <section>
          <SectionHeading title="Watching" count={watchedSummaries.length} />
          <MarkerList items={watchedSummaries} />
        </section>
      )}

      {/* Primary view: results grouped by body system, in plain language.
          The technical marker names stay tucked inside each group until asked
          for, so the page opens calm rather than as a wall of jargon. */}
      <section>
        <SectionHeading title="Your results by system" />
        <p className="mt-2 max-w-xl text-sm text-ink-2">
          Grouped the way a doctor reads them. Open any group to see the
          individual markers behind it.
        </p>
        <div className="mt-4 space-y-3">
          {systemGroups.map((group) => (
            <SystemGroupCard key={group.category} group={group} />
          ))}
        </div>
      </section>

      {/* The same grouping, explorable on the figure */}
      {regions.length > 0 && (
        <section>
          <SectionHeading title="Or explore on the body" />
          <div className="mt-3">
            <BodyMapView regions={regions} />
          </div>
        </section>
      )}

      {/* Latest test — a compact summary, not a technical table */}
      {recentSession && (
        <section>
          <SectionHeading title="Latest test" />
          <Link
            href="/app/timeline"
            className="au-card mt-3 flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-paper-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink">
                {formatDate(recentSession.date)}
                {recentSession.labName ? ` · ${recentSession.labName}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-ink-3">
                {recentResults.length} result{recentResults.length === 1 ? "" : "s"} added
                {recentSession.fasting ? " · fasting" : ""}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium text-brand-strong">
              View timeline <ArrowRight className="inline size-3.5" />
            </span>
          </Link>
        </section>
      )}

      {/* Stale markers */}
      {stale.length > 0 && (
        <section>
          <SectionHeading title="Not measured in over a year" />
          <ul className="mt-3 flex flex-wrap gap-2">
            {stale.map((s) => (
              <li key={s.biomarker.id}>
                <Link
                  href={`/app/biomarkers/${s.biomarker.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  {s.biomarker.name}
                  <span className="text-xs text-ink-3">
                    last {s.latest ? formatDate(s.latest.date) : "n/a"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <dt className="microlabel">{label}</dt>
      <dd className={cn("mt-1.5 font-display text-3xl leading-none tnum sm:text-4xl", color)}>
        {n}
      </dd>
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="au-eyebrow flex items-baseline gap-2 border-t border-line pt-3">
      {title}
      {count != null && <span className="tnum text-ink-3">{count}</span>}
    </h2>
  );
}

// Friendly, plain-language name + one-liner for each body system, so the
// grouped view never leads with clinical jargon.
type SystemGroup = {
  category: BiomarkerCategory;
  items: BiomarkerSummary[];
  out: number;
  near: number;
  total: number;
};

const SYSTEM: Record<BiomarkerCategory, { name: string; blurb: string }> = {
  LIPIDS: { name: "Cholesterol", blurb: "Blood fats that affect your heart" },
  GLUCOSE: { name: "Blood sugar", blurb: "How your body handles sugar" },
  THYROID: { name: "Thyroid", blurb: "The gland that sets your metabolism" },
  CBC: { name: "Blood count", blurb: "Your red and white blood cells" },
  LIVER: { name: "Liver", blurb: "How your liver is doing" },
  KIDNEY: { name: "Kidneys", blurb: "Kidney function and body salts" },
  VITAMINS: { name: "Vitamins", blurb: "Vitamin and mineral levels" },
  IRON: { name: "Iron", blurb: "Iron in your blood and stores" },
  HORMONES: { name: "Hormones", blurb: "Your hormone levels" },
  OTHER: { name: "Inflammation & other", blurb: "General and inflammation markers" },
};

// Marker-level severity (out > near > in range) for sorting within a group.
function severity(s: BiomarkerSummary): number {
  if (isOutOfRange(s.latestStatus)) return 2;
  if (isBorderline(s.latestStatus)) return 1;
  return 0;
}
// Group-level rank, so systems that need a look float to the top.
function groupRank(g: SystemGroup): number {
  if (g.out > 0) return 2;
  if (g.near > 0) return 1;
  return 0;
}

// A collapsed system: friendly name, plain blurb, and a one-line status the
// user reads without knowing a single marker name. Open it for the specifics.
function SystemGroupCard({ group }: { group: SystemGroup }) {
  const meta = SYSTEM[group.category];
  return (
    <details className="au-card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-paper-2 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-ink">{meta.name}</p>
          <p className="mt-0.5 text-xs text-ink-3">{meta.blurb}</p>
        </div>
        <GroupStatus out={group.out} near={group.near} total={group.total} />
        <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-90" />
      </summary>
      <ul className="divide-y divide-line border-t border-line">
        {group.items.map((s) => (
          <li key={s.biomarker.id}>
            <MarkerRow s={s} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function GroupStatus({ out, near, total }: { out: number; near: number; total: number }) {
  const [dot, txt, text] =
    out > 0
      ? ["bg-out", "text-out", `${out} need${out === 1 ? "s" : ""} a look`]
      : near > 0
        ? ["bg-borderline", "text-borderline", `${near} near a boundary`]
        : ["bg-in-range", "text-in-range", "All in range"];
  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
      <span className={cn("flex items-center gap-1.5 text-sm font-medium", txt)}>
        <span className={cn("size-2 rounded-full", dot)} />
        {text}
      </span>
      <span className="text-xs text-ink-3">
        {total} marker{total === 1 ? "" : "s"}
      </span>
    </span>
  );
}

// How far past its range a marker sits, as a fraction, for severity sorting.
function outDistance(s: BiomarkerSummary): number {
  const r = s.bandRange;
  const v = s.latest?.value;
  if (!r || v == null) return 0;
  if (r.max != null && v > r.max) return (v - r.max) / (Math.abs(r.max) || 1);
  if (r.min != null && v < r.min) return (r.min - v) / (Math.abs(r.min) || 1);
  return 0;
}

// A plain-language read of where things stand, in the brand's calm voice.
function standSummary(out: number, near: number, inRange: number): string {
  const m = (n: number) => `${n} marker${n === 1 ? "" : "s"}`;
  if (out > 0) {
    const tail = near > 0 ? ` and ${m(near)} sit near a boundary` : "";
    return `${m(out)} outside their range${tail}. The rest are where they should be.`;
  }
  if (near > 0) {
    return `Nothing is out of range. ${m(near)} worth a glance near a boundary.`;
  }
  if (inRange > 0) return "Everything is within range right now.";
  return "Add a test session to start seeing where things stand.";
}

/* Ledger rows in a white card, as on the landing's panel table: name + trend
   left; a range bar showing where the value sits in its normal range, the
   value, and a status label right. Hairline dividers, colour only on data. */
function MarkerList({ items }: { items: BiomarkerSummary[] }) {
  return (
    <ul className="au-card mt-3 divide-y divide-line overflow-hidden">
      {items.map((s) => (
        <li key={s.biomarker.id}>
          <MarkerRow s={s} />
        </li>
      ))}
    </ul>
  );
}

function MarkerRow({ s }: { s: BiomarkerSummary }) {
  const delta = s.trend.deltaPct;
  return (
    <Link
      href={`/app/biomarkers/${s.biomarker.id}`}
      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-paper-2"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{s.biomarker.name}</p>
        <p className="mt-0.5 text-xs text-ink-3">
          {TREND_LABEL[s.trend.direction]}
          {delta != null && s.trend.direction !== "INSUFFICIENT_DATA" && (
            <span className="tnum">
              {" "}
              ({delta > 0 ? "+" : ""}
              {formatNumber(delta, 1)}% vs previous)
            </span>
          )}
        </p>
      </div>
      {s.latest && s.bandRange && (s.bandRange.min != null || s.bandRange.max != null) && (
        <RangeBar
          value={s.latest.value}
          min={s.bandRange.min}
          max={s.bandRange.max}
          status={s.latestStatus}
          className="hidden w-24 shrink-0 sm:block md:w-36"
        />
      )}
      <span className="tnum w-20 shrink-0 text-right text-sm font-medium text-ink sm:w-24">
        {s.latest ? formatNumber(s.latest.value) : "n/a"}{" "}
        <span className="font-normal text-ink-3">{s.biomarker.canonicalUnit}</span>
      </span>
      <StatusBadge status={s.latestStatus} className="shrink-0" />
    </Link>
  );
}

function EmptyDashboard({ name }: { name: string }) {
  return (
    <div className="animate-rise flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="max-w-md">
        <h1 className="au-hl text-4xl text-ink">
          The logbook for {name} is <span className="em">empty</span>
        </h1>
        <p className="mt-3 leading-relaxed text-ink-2">
          Grab any lab report, even an old one. Panel shortcuts pre-fill the marker rows,
          so a 20-marker report takes under three minutes to enter. Trends start showing
          up once a marker has two or three values.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/app/sessions/new">
            <Plus /> Add a test session
          </Link>
        </Button>
      </div>
    </div>
  );
}
