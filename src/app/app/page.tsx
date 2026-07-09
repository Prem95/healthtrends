import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, Check, ChevronRight, Plus } from "lucide-react";
import {
  getActiveProfile,
  getBiomarkers,
  getResults,
  getSessions,
  getWatched,
} from "@/lib/data";
import { summarize, isOutOfRange, isBorderline, type BiomarkerSummary } from "@/lib/analytics";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { RangeBar } from "@/components/charts/range-bar";
import { TREND_LABEL, type BiomarkerCategory } from "@/lib/domain";

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

  const watchedSummaries = watched
    .map((id) => byId.get(id))
    .filter((s): s is BiomarkerSummary => !!s);

  const withData = summaries.filter((s) => s.latest);
  const total = withData.length;
  const inRangeCount = withData.filter((s) => s.latestStatus === "IN_RANGE").length;
  const outCount = withData.filter((s) => isOutOfRange(s.latestStatus)).length;
  const nearCount = withData.filter((s) => isBorderline(s.latestStatus)).length;

  // Group every marker that has data by its body system, so a layperson meets a
  // handful of friendly systems instead of a wall of technical marker names.
  const bySystem = new Map<BiomarkerCategory, BiomarkerSummary[]>();
  for (const s of withData) {
    const list = bySystem.get(s.biomarker.category);
    if (list) list.push(s);
    else bySystem.set(s.biomarker.category, [s]);
  }
  const systemGroups: SystemGroup[] = [...bySystem.entries()].map(([category, items]) => {
    const sorted = [...items].sort(
      (a, b) => severity(b) - severity(a) || outDistance(b) - outDistance(a),
    );
    const out = items.filter((s) => isOutOfRange(s.latestStatus)).length;
    const near = items.filter((s) => isBorderline(s.latestStatus)).length;
    const inRange = items.filter((s) => s.latestStatus === "IN_RANGE").length;
    return {
      category,
      items: sorted,
      out,
      near,
      inRange,
      neutral: items.length - out - near - inRange,
      total: items.length,
    };
  });

  const byName = (a: SystemGroup, b: SystemGroup) =>
    SYSTEM[a.category].name.localeCompare(SYSTEM[b.category].name);
  // Most red markers first, then most amber, so the system that most warrants a
  // look sits top-left.
  const needsAttention = systemGroups
    .filter((g) => g.out > 0 || g.near > 0)
    .sort((a, b) => b.out - a.out || b.near - a.near || byName(a, b));
  const lookingGood = systemGroups
    .filter((g) => g.out === 0 && g.near === 0)
    .sort(byName);

  const recentSession = sessions[0] ?? null;
  const recentResults = recentSession
    ? summaries.flatMap((s) =>
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
      <header>
        <p className="au-eyebrow">Logbook · {profile.name}</p>
        <h1 className="au-hl mt-2 text-4xl text-ink">Where things stand today</h1>
        <Summary
          inRange={inRangeCount}
          total={total}
          out={outCount}
          near={nearCount}
          tests={sessions.length}
          latestDate={recentSession ? formatDate(recentSession.date) : null}
        />
      </header>

      {/* Watched markers pinned first */}
      {watchedSummaries.length > 0 && (
        <section>
          <SectionHeading title="Watching" count={watchedSummaries.length} />
          <MarkerList items={watchedSummaries} />
        </section>
      )}

      {/* Systems that have any out-of-range or near-boundary markers, most
          severe first. Everything a layperson needs is on the card face; the
          marker names and values stay tucked in the detail view. */}
      {needsAttention.length > 0 && (
        <section>
          <SectionHeading title="Needs your attention" count={needsAttention.length} />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {needsAttention.map((group) => (
              <AttentionCard key={group.category} group={group} />
            ))}
          </div>
        </section>
      )}

      {/* All-in-range systems, quiet and tucked into one collapsible row. */}
      {lookingGood.length > 0 && (
        <section>
          <SectionHeading title="Looking good" />
          <div className="mt-4">
            <LookingGoodBlock groups={lookingGood} />
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
    </div>
  );
}

// Calm top-of-page read: lead with how much is in range, name the rest in plain
// language, and keep colour to a small icon+label rather than a big red number.
function Summary({
  inRange,
  total,
  out,
  near,
  tests,
  latestDate,
}: {
  inRange: number;
  total: number;
  out: number;
  near: number;
  tests: number;
  latestDate: string | null;
}) {
  return (
    <div className="au-card mt-6 max-w-2xl p-5 sm:p-6">
      <p className="font-display text-2xl leading-tight text-ink sm:text-3xl">
        <span className="text-in-range">{inRange}</span> of {total} markers in range
      </p>
      {(out > 0 || near > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          {out > 0 && (
            <span className="inline-flex items-center gap-1.5 text-out">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {out} worth discussing with your doctor
            </span>
          )}
          {near > 0 && (
            <span className="inline-flex items-center gap-1.5 text-borderline-ink">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {near} near a boundary
            </span>
          )}
        </div>
      )}
      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        {tests} test{tests === 1 ? "" : "s"} logged
        {latestDate && <> · latest {latestDate}</>}
      </p>
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
  inRange: number;
  neutral: number;
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

// One plain-language read of a flagged system, no numbers or units. The card
// title already names the system, so the insight just states the lean. Which
// way its off-range markers sit (above vs below normal) drives the wording.
function insight(group: SystemGroup): string {
  let high = 0;
  let low = 0;
  for (const s of group.items) {
    const st = s.latestStatus;
    if (st === "HIGH" || st === "BORDERLINE_HIGH") high++;
    else if (st === "LOW" || st === "BORDERLINE_LOW") low++;
  }
  if (high > 0 && low === 0) return "Trending high";
  if (low > 0 && high === 0) return "Trending low";
  if (high > low) return "Mostly trending high";
  if (low > high) return "Mostly trending low";
  return "Worth a closer look";
}

// A flagged system as an equal-height card: name, one-line blurb, a plain
// insight, a segmented in-range/near/out meter, and a normalized status label.
// The whole card links into the Biomarkers browser at this system; individual
// marker names and values live there, never on the dashboard face.
function AttentionCard({ group }: { group: SystemGroup }) {
  const meta = SYSTEM[group.category];
  return (
    <Link
      href={`/app/biomarkers#${group.category}`}
      className="au-card group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-paper-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base text-ink">{meta.name}</p>
          <p className="mt-0.5 truncate text-xs text-ink-3">{meta.blurb}</p>
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="text-sm text-ink-2">{insight(group)}</p>
      <div className="mt-auto space-y-2 pt-1">
        <StatusMeter group={group} />
        <CardStatus out={group.out} near={group.near} />
      </div>
    </Link>
  );
}

// Thin segmented bar: the ratio of in-range / near-boundary / out-of-range (and
// any marker without a range). Colour is backed by a worded aria-label/tooltip
// so the meaning never rides on colour alone.
function StatusMeter({ group }: { group: SystemGroup }) {
  const segs = [
    { n: group.inRange, cls: "bg-in-range", label: `${group.inRange} in range` },
    { n: group.near, cls: "bg-borderline", label: `${group.near} near a boundary` },
    { n: group.out, cls: "bg-out", label: `${group.out} out of range` },
    { n: group.neutral, cls: "bg-neutral-status", label: `${group.neutral} without a range` },
  ].filter((s) => s.n > 0);
  const desc = segs.map((s) => s.label).join(", ");
  return (
    <div
      role="img"
      aria-label={desc}
      title={desc}
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-paper-3"
    >
      {segs.map((s) => (
        <span key={s.cls} className={s.cls} style={{ flexGrow: s.n }} />
      ))}
    </div>
  );
}

// Normalized status label — "N to review" reads the same for 1 or many, and the
// icon carries the meaning alongside the colour (never colour alone).
function CardStatus({ out, near }: { out: number; near: number }) {
  const count = out > 0 ? out : near;
  const Icon = out > 0 ? AlertCircle : AlertTriangle;
  const color = out > 0 ? "text-out" : "text-borderline-ink";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", color)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {count} to review
    </span>
  );
}

// All-in-range systems, collapsed into one quiet row of check-marked chips.
function LookingGoodBlock({ groups }: { groups: SystemGroup[] }) {
  return (
    <details className="au-card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-paper-2 [&::-webkit-details-marker]:hidden">
        <Check className="size-4 shrink-0 text-in-range" aria-hidden />
        <span className="flex-1 text-sm font-medium text-ink">All in range</span>
        <span className="text-xs text-ink-3">
          {groups.length} system{groups.length === 1 ? "" : "s"}
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-90" />
      </summary>
      <div className="flex flex-wrap gap-2 border-t border-line p-4">
        {groups.map((g) => (
          <Link
            key={g.category}
            href={`/app/biomarkers#${g.category}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
          >
            <Check className="size-3.5 shrink-0 text-in-range" aria-hidden />
            {SYSTEM[g.category].name}
          </Link>
        ))}
      </div>
    </details>
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
