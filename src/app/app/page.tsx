import Link from "next/link";
import { ArrowRight, Eye, Plus } from "lucide-react";
import {
  getActiveProfile,
  getBiomarkers,
  getResults,
  getSessions,
  getWatched,
} from "@/lib/data";
import { summarize, isOutOfRange, isBorderline, type BiomarkerSummary } from "@/lib/analytics";
import { formatDate, formatNumber, monthsSince } from "@/lib/utils";
import { StatusBadge, Badge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { TREND_LABEL } from "@/lib/domain";

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
  const outOfRange = summaries.filter((s) => isOutOfRange(s.latestStatus));
  const trending = summaries.filter(
    (s) =>
      (s.trend.direction === "RISING" || s.trend.direction === "FALLING") &&
      !isOutOfRange(s.latestStatus),
  );
  const borderline = summaries.filter((s) => isBorderline(s.latestStatus));
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{profile.name}’s health picture</h1>
          <p className="mt-1 text-sm text-ink-2">
            {sessions.length} test session{sessions.length === 1 ? "" : "s"} ·{" "}
            {summaries.length} biomarkers tracked
          </p>
        </div>
      </header>

      {/* Watched markers pinned first */}
      {watchedSummaries.length > 0 && (
        <section>
          <SectionHeading icon={<Eye className="size-4" />} title="Watching" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {watchedSummaries.map((s) => (
              <MarkerCard key={s.biomarker.id} s={s} />
            ))}
          </div>
        </section>
      )}

      {/* Attention: out of range */}
      <section>
        <SectionHeading title="Needs attention" />
        {outOfRange.length === 0 && borderline.length === 0 ? (
          <p className="mt-3 text-sm text-ink-2">
            Nothing outside its reference range right now.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...outOfRange, ...borderline].map((s) => (
              <MarkerCard key={s.biomarker.id} s={s} />
            ))}
          </div>
        )}
      </section>

      {/* Trending toward a boundary */}
      {trending.length > 0 && (
        <section>
          <SectionHeading title="Moving across your last 3 tests" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {trending.map((s) => (
              <MarkerCard key={s.biomarker.id} s={s} />
            ))}
          </div>
        </section>
      )}

      {/* Recent session */}
      {recentSession && (
        <section>
          <SectionHeading title="Most recent session" />
          <div className="mt-3 rounded-lg border border-line bg-paper">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="font-medium text-ink">{formatDate(recentSession.date)}</span>
                {recentSession.labName && (
                  <span className="text-sm text-ink-3">{recentSession.labName}</span>
                )}
                {recentSession.fasting && <Badge>Fasting</Badge>}
              </div>
              <Link
                href="/app/timeline"
                className="text-sm font-medium text-brand-strong hover:underline"
              >
                All sessions <ArrowRight className="inline size-3.5" />
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {recentResults.slice(0, 6).map(({ summary, point }) => (
                <li key={point.resultId}>
                  <Link
                    href={`/app/biomarkers/${summary.biomarker.id}`}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-paper-2"
                  >
                    <span className="text-sm text-ink">{summary.biomarker.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="tnum text-sm text-ink-2">
                        {formatNumber(point.value)} {summary.biomarker.canonicalUnit}
                      </span>
                      <StatusBadge status={point.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {recentResults.length > 6 && (
              <p className="px-5 py-2 text-xs text-ink-3">
                + {recentResults.length - 6} more in this session
              </p>
            )}
          </div>
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
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  {s.biomarker.name}
                  <span className="text-xs text-ink-3">
                    last {s.latest ? formatDate(s.latest.date) : "—"}
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

function SectionHeading({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-2 uppercase">
      {icon}
      {title}
    </h2>
  );
}

function MarkerCard({ s }: { s: BiomarkerSummary }) {
  const delta = s.trend.deltaPct;
  return (
    <Link
      href={`/app/biomarkers/${s.biomarker.id}`}
      className="group rounded-lg border border-line bg-paper p-4 transition-colors hover:border-brand/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink group-hover:text-brand-strong">
          {s.biomarker.name}
        </p>
        <StatusBadge status={s.latestStatus} />
      </div>
      <p className="mt-3 font-display text-2xl text-ink tnum">
        {s.latest ? formatNumber(s.latest.value) : "—"}{" "}
        <span className="text-sm text-ink-3">{s.biomarker.canonicalUnit}</span>
      </p>
      <p className="mt-1 text-xs text-ink-3">
        {TREND_LABEL[s.trend.direction]}
        {delta != null && s.trend.direction !== "INSUFFICIENT_DATA" && (
          <span className="tnum">
            {" "}
            · {delta > 0 ? "+" : ""}
            {formatNumber(delta, 1)}% vs previous
          </span>
        )}
      </p>
    </Link>
  );
}

function EmptyDashboard({ name }: { name: string }) {
  return (
    <div className="animate-rise flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="max-w-md">
        <h1 className="font-display text-3xl text-ink">
          Let’s add {name}’s first test
        </h1>
        <p className="mt-3 leading-relaxed text-ink-2">
          Grab any lab report — even an old one. Panel shortcuts (Lipid Panel, CBC, Thyroid…)
          make a 20-marker report take under three minutes. The more history you add, the more
          the trends can tell you.
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
