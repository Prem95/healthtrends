import Link from "next/link";
import {
  getActiveProfile,
  getBiomarkers,
  getCustomRanges,
  getResults,
  getSessions,
  getUnitPreferences,
  getWatched,
} from "@/lib/data";
import { summarize, isOutOfRange, isBorderline, type BiomarkerSummary } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
import { formatInUnit, resolveDisplayUnit, statusTone } from "@/lib/domain";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/charts/sparkline";
import { Reveal, CountUp } from "@/components/motion/reveal";

/*
  Markers overview, per the handoff's home screen: triage first — the olive
  summary card counts in range / drifting / out, then a "needs attention"
  list, then the A–Z ledger. Colour appears only on data (sparklines, pills,
  stat values); everything else is grayscale mono metadata.
*/

const TONE_VAR: Record<string, string> = {
  "in-range": "var(--in-range)",
  borderline: "var(--borderline)",
  out: "var(--out)",
  neutral: "var(--neutral-status)",
};

export default async function DashboardPage() {
  const profile = (await getActiveProfile())!;
  const [biomarkers, results, sessions, watched, unitPrefs, customRanges] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
    getSessions(profile.id),
    getWatched(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);

  const summaries = summarize(results, biomarkers, profile.sex, customRanges);
  const byId = new Map(summaries.map((s) => [s.biomarker.id, s]));

  const watchedSummaries = watched
    .map((id) => byId.get(id))
    .filter((s): s is BiomarkerSummary => !!s && !!s.latest);

  const withData = summaries.filter((s) => s.latest);

  const out = withData.filter((s) => isOutOfRange(s.latestStatus));
  const drifting = withData.filter((s) => isBorderline(s.latestStatus));
  const inRange = withData.filter((s) => s.latestStatus === "IN_RANGE");

  const attention = [...out, ...drifting].sort(
    (a, b) => severity(b) - severity(a) || outDistance(b) - outDistance(a),
  );
  const attentionIds = new Set(attention.map((s) => s.biomarker.id));
  const others = withData
    .filter((s) => !attentionIds.has(s.biomarker.id))
    .sort((a, b) => a.biomarker.name.localeCompare(b.biomarker.name));

  const recentSession = sessions[0] ?? null;
  const recentCount = recentSession
    ? withData.reduce(
        (n, s) => n + s.points.filter((p) => p.sessionId === recentSession.id).length,
        0,
      )
    : 0;

  if (sessions.length === 0) {
    return <EmptyDashboard name={profile.name} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      {/* Header: mono title + the one accent action */}
      <Reveal as="header">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="au-mono text-[13px] text-ink">Markers</h1>
          <Link
            href="/app/sessions/new"
            className="au-mono text-[12px] text-brand transition-colors duration-300 hover:text-brand-strong"
          >
            + Add
          </Link>
        </div>
        <p className="au-mono mt-2 text-[11px] text-ink-3">
          {profile.name} · {withData.length} markers
          {recentSession && <> · updated {formatDate(recentSession.date)}</>}
        </p>
      </Reveal>

      {/* Olive summary card: the triage read */}
      <Reveal delay={80}>
        <div className="au-card au-card--olive flex gap-4 rounded-2xl p-6">
          <SummaryStat n={inRange.length} label="In range" delay={250} />
          <SummaryStat
            n={drifting.length}
            label="Drifting"
            color={drifting.length ? "var(--borderline-ink)" : undefined}
            delay={350}
          />
          <SummaryStat
            n={out.length}
            label="Out of range"
            color={out.length ? "var(--out)" : undefined}
            delay={450}
          />
        </div>
      </Reveal>

      {watchedSummaries.length > 0 && (
        <MarkerSection title="Watching" items={watchedSummaries} unitPrefs={unitPrefs} showValue />
      )}

      {attention.length > 0 && (
        <MarkerSection title="Needs attention" items={attention} unitPrefs={unitPrefs} />
      )}

      {others.length > 0 && (
        <MarkerSection
          title="All other markers · A–Z"
          items={others}
          unitPrefs={unitPrefs}
          showValue
          quietSpark
        />
      )}

      {recentSession && (
        <Reveal as="section">
          <h2 className="au-eyebrow">Latest test</h2>
          <Link
            href="/app/timeline"
            className="au-row group mt-1 flex items-center gap-4 border-t border-line py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="au-row-title text-[15px] font-medium text-ink">
                {formatDate(recentSession.date)}
                {recentSession.labName ? ` · ${recentSession.labName}` : ""}
              </p>
              <p className="au-mono mt-1 text-[11px] text-ink-3">
                {recentCount} result{recentCount === 1 ? "" : "s"}
                {recentSession.fasting ? " · fasting" : ""}
              </p>
            </div>
            <span className="au-mono text-[12px] text-ink-3 transition-colors duration-300 group-hover:text-brand">
              Timeline →
            </span>
          </Link>
        </Reveal>
      )}
    </div>
  );
}

function SummaryStat({
  n,
  label,
  color,
  delay,
}: {
  n: number;
  label: string;
  color?: string;
  delay: number;
}) {
  return (
    <div className="flex-1">
      <div
        className="au-num text-[26px] leading-none sm:text-[30px]"
        style={color ? { color } : undefined}
      >
        <CountUp value={n} startDelay={delay} duration={700} />
      </div>
      <p className="au-mono mt-2 text-[10px] text-[color:var(--au-olive-label)]">{label}</p>
    </div>
  );
}

function MarkerSection({
  title,
  items,
  unitPrefs,
  showValue = false,
  quietSpark = false,
}: {
  title: string;
  items: BiomarkerSummary[];
  unitPrefs: Record<string, string>;
  showValue?: boolean;
  quietSpark?: boolean;
}) {
  return (
    <Reveal as="section">
      <h2 className="au-eyebrow">{title}</h2>
      <ul className="mt-1">
        {items.map((s) => (
          <li key={s.biomarker.id}>
            <MarkerRow s={s} unitPrefs={unitPrefs} showValue={showValue} quietSpark={quietSpark} />
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/* One marker as a hairline row: name · sparkline · (value) · status pill.
   Hover indents and tints the name — the handoff's row interaction. */
function MarkerRow({
  s,
  unitPrefs,
  showValue,
  quietSpark,
}: {
  s: BiomarkerSummary;
  unitPrefs: Record<string, string>;
  showValue: boolean;
  quietSpark: boolean;
}) {
  const tone = statusTone(s.latestStatus);
  const spark = s.points.slice(-8).map((p) => p.value);
  const displayUnit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
  return (
    <Link
      href={`/app/biomarkers/${s.biomarker.id}`}
      className="au-row flex items-center gap-4 border-t border-line py-3.5"
    >
      <span className="au-row-title min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
        {s.biomarker.name}
      </span>
      {spark.length >= 2 && (
        <Sparkline
          values={spark}
          stroke={quietSpark ? "var(--neutral-status)" : TONE_VAR[tone]}
          draw
          className="hidden shrink-0 sm:block"
        />
      )}
      {showValue && s.latest && (
        <span className="au-num shrink-0 text-[13px] text-ink-3">
          {formatInUnit(s.biomarker, s.latest.value, displayUnit)}{" "}
          <span className="text-ink-3/70">{displayUnit}</span>
        </span>
      )}
      <StatusBadge status={s.latestStatus} className="shrink-0" />
    </Link>
  );
}

// Marker-level severity (out > drifting) for sorting the attention list.
function severity(s: BiomarkerSummary): number {
  if (isOutOfRange(s.latestStatus)) return 2;
  if (isBorderline(s.latestStatus)) return 1;
  return 0;
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

function EmptyDashboard({ name }: { name: string }) {
  return (
    <Reveal className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="max-w-md">
        <p className="au-eyebrow">First entry</p>
        <h1 className="au-hl mt-3 text-4xl text-ink">
          The logbook for {name} is <span className="em">empty</span>
        </h1>
        <p className="mt-4 leading-relaxed text-ink-2">
          Grab any lab report, even an old one. Panel shortcuts pre-fill the marker rows,
          so a 20-marker report takes under three minutes to enter. Trends start showing
          up once a marker has two or three values.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/app/sessions/new">＋ Add a test session</Link>
        </Button>
      </div>
    </Reveal>
  );
}
