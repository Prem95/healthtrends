import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { BiomarkerSummary } from "@/lib/analytics";
import { attentionRank, needsAttention, toDigest, type MarkerDigest } from "@/lib/digest";
import {
  CATEGORY_LABEL,
  statusTone,
  type BiomarkerCategory,
  type Profile,
  type TestSession,
} from "@/lib/domain";
import { CATEGORY_COMMON_ORDER } from "@/lib/commonality";
import type { ViewCtx } from "@/lib/view-context";
import { formatDate, monthsSince } from "@/lib/utils";
import { Art } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { StatusGlyph } from "@/components/ui/status-badge";
import { StatusSummary } from "@/components/markers/status-summary";
import { Reveal } from "@/components/motion/reveal";
import {
  MarkerCard,
  MarkerList,
  MarkerRow,
  SectionHeading,
} from "@/components/markers/marker-parts";

/*
  Overview: the answer to "how am I doing?" in one screen. A single headline
  count, then only what needs a closer look as full cards, then everything
  else folded into its body system. Colour appears on results and nowhere
  else.
*/

export function OverviewView({
  ctx,
  profile,
  summaries,
  sessions,
  watched,
  unitPrefs,
}: {
  ctx: ViewCtx;
  profile: Profile;
  summaries: BiomarkerSummary[];
  sessions: TestSession[];
  watched: string[];
  unitPrefs: Record<string, string>;
}) {
  if (sessions.length === 0) return <EmptyOverview name={profile.name} ctx={ctx} />;


  const digests = summaries.filter((s) => s.latest).map((s) => toDigest(s, unitPrefs));
  const byId = new Map(digests.map((d) => [d.id, d]));
  const href = (id: string) => `${ctx.base}/biomarkers/${id}`;

  const attention = digests
    .filter((d) => needsAttention(d.status))
    .sort((a, b) => attentionRank(b) - attentionRank(a));
  const watching = watched
    .map((id) => byId.get(id))
    .filter((d): d is MarkerDigest => !!d && !needsAttention(d.status));

  const systems = CATEGORY_COMMON_ORDER.map((category) => ({
    category,
    items: digests.filter((d) => d.category === category),
  })).filter((g) => g.items.length > 0);

  // Per-session tallies for the recent-tests list.
  const tally = new Map<string, { total: number; flagged: number }>();
  for (const s of summaries) {
    for (const p of s.points) {
      const t = tally.get(p.sessionId) ?? { total: 0, flagged: 0 };
      t.total += 1;
      if (needsAttention(p.status)) t.flagged += 1;
      tally.set(p.sessionId, t);
    }
  }

  const latest = sessions[0];
  const months = monthsSince(latest.date);

  return (
    <div className="space-y-10">
      <Reveal as="header">
        <h1 className="display text-[1.75rem] text-ink sm:text-[2rem]">Overview</h1>
        <p className="mt-1.5 text-sm text-ink-3">
          {profile.name} · last test {formatDate(latest.date)}
          {months >= 1 && ` · ${months} month${months === 1 ? "" : "s"} ago`}
        </p>
      </Reveal>

      {/* The headline read */}
      <Reveal as="section" delay={60}>
        <StatusSummary digests={digests} />
      </Reveal>

      {/* Needs a closer look */}
      <Reveal as="section" delay={120}>
        <SectionHeading title="Worth a closer look" count={attention.length} />
        {attention.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {attention.map((d) => (
              <MarkerCard key={d.id} d={d} href={href(d.id)} />
            ))}
          </div>
        ) : (
          <div className="card flex items-center gap-3 px-5 py-4 text-sm text-ink-2">
            <StatusGlyph status="IN_RANGE" size={12} />
            Every marker with a reference range is inside it on its latest test.
          </div>
        )}
      </Reveal>

      {watching.length > 0 && (
        <Reveal as="section">
          <SectionHeading title="Watching" count={watching.length} />
          <MarkerList>
            {watching.map((d) => (
              <MarkerRow key={d.id} d={d} href={href(d.id)} />
            ))}
          </MarkerList>
        </Reveal>
      )}

      {/* Everything, folded into body systems */}
      <Reveal as="section">
        <SectionHeading
          title="By body system"
          action={
            <Link
              href={`${ctx.base}/biomarkers`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
            >
              All markers <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map(({ category, items }) => (
            <SystemCard key={category} category={category} items={items} base={ctx.base} />
          ))}
        </div>
      </Reveal>

      {/* Recent tests */}
      <Reveal as="section">
        <SectionHeading
          title="Recent tests"
          action={
            <Link
              href={`${ctx.base}/timeline`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-strong"
            >
              Full timeline <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        />
        <MarkerList>
          {sessions.slice(0, 3).map((s) => {
            const t = tally.get(s.id) ?? { total: 0, flagged: 0 };
            return (
              <Link
                key={s.id}
                href={`${ctx.base}/timeline`}
                className="row-link flex items-center gap-4 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="row-title text-[0.9375rem] font-medium text-ink">
                    {formatDate(s.date)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-3">
                    {[s.labName, s.fasting ? "fasting" : null].filter(Boolean).join(" · ") ||
                      "Lab not recorded"}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm text-ink-2 tnum">
                  {t.total} result{t.total === 1 ? "" : "s"}
                  <span className="block text-xs text-ink-3">
                    {t.flagged > 0 ? `${t.flagged} outside or near a limit` : "all in range"}
                  </span>
                </p>
              </Link>
            );
          })}
        </MarkerList>
      </Reveal>
    </div>
  );
}

function SystemCard({
  category,
  items,
  base,
}: {
  category: BiomarkerCategory;
  items: MarkerDigest[];
  base: string;
}) {
  const out = items.filter((d) => statusTone(d.status) === "out").length;
  const borderline = items.filter((d) => statusTone(d.status) === "borderline").length;
  const note =
    out > 0 || borderline > 0
      ? [out > 0 ? `${out} out of range` : null, borderline > 0 ? `${borderline} borderline` : null]
          .filter(Boolean)
          .join(" · ")
      : "All in range";
  return (
    <Link href={`${base}/biomarkers#${category}`} className="card row-link flex flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="row-title text-[0.9375rem] font-medium text-ink">
          {CATEGORY_LABEL[category]}
        </p>
        <p className="shrink-0 text-xs text-ink-3 tnum">
          {items.length} marker{items.length === 1 ? "" : "s"}
        </p>
      </div>
      {/* One glyph per marker: the system at a glance */}
      <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden>
        {items.map((d) => (
          <StatusGlyph key={d.id} status={d.status} size={12} />
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-2">{note}</p>
    </Link>
  );
}

function EmptyOverview({ name, ctx }: { name: string; ctx: ViewCtx }) {
  return (
    <Reveal>
      <Art
        name="hero"
        scrim
        flip
        priority
        sizes="100vw"
        className="flex min-h-[60vh] flex-col justify-end p-7 text-white sm:p-12"
      >
        <p className="eyebrow text-white/75">First entry</p>
        <h1 className="display mt-3 max-w-[16ch] text-[2rem] text-white sm:text-[3rem]">
          Start {name}&rsquo;s record with any report
        </h1>
        <p className="mt-4 max-w-md leading-relaxed text-white/85">
          Grab a lab report, even an old one. Panel shortcuts pre-fill the rows, so a
          20-marker report takes about three minutes to enter. Trends appear once a marker
          has two results.
        </p>
        {!ctx.readOnly && (
          <Button asChild size="lg" variant="light" className="mt-8 self-start">
            <Link href="/app/sessions/new">
              <Plus aria-hidden /> Add your first results
            </Link>
          </Button>
        )}
      </Art>
    </Reveal>
  );
}
