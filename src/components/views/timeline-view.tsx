import Link from "next/link";
import { Flag, Plus } from "lucide-react";
import type { BiomarkerSummary } from "@/lib/analytics";
import { addLifeEvent, deleteLifeEvent, deleteSession } from "@/app/app/actions";
import { needsAttention } from "@/lib/digest";
import {
  formatInUnit,
  resolveDisplayUnit,
  statusTone,
  type LifeEvent,
  type Profile,
  type ResultStatus,
  type TestSession,
} from "@/lib/domain";
import type { ViewCtx } from "@/lib/view-context";
import { formatDate, prettyUnit, todayISO } from "@/lib/utils";
import { StatusBadge, StatusGlyph } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Reveal } from "@/components/motion/reveal";

/*
  Every test and life event on one rail, newest first, grouped by year. A
  test opens to show its results; a life event sits between tests as a dated
  note, so a change in a marker has its "why" beside it.
*/

type Row = {
  resultId: string;
  biomarkerId: string;
  name: string;
  unit: string;
  valueLabel: string;
  status: ResultStatus;
};

export function TimelineView({
  ctx,
  profile,
  sessions,
  summaries,
  events,
  unitPrefs,
}: {
  ctx: ViewCtx;
  profile: Profile;
  sessions: TestSession[];
  summaries: BiomarkerSummary[];
  events: LifeEvent[];
  unitPrefs: Record<string, string>;
}) {
  const rowsBySession = new Map<string, Row[]>();
  for (const s of summaries) {
    const unit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
    for (const p of s.points) {
      if (!rowsBySession.has(p.sessionId)) rowsBySession.set(p.sessionId, []);
      rowsBySession.get(p.sessionId)!.push({
        resultId: p.resultId,
        biomarkerId: s.biomarker.id,
        name: s.biomarker.name,
        unit: prettyUnit(unit),
        valueLabel: formatInUnit(s.biomarker, p.value, unit),
        status: p.status,
      });
    }
  }
  // Flagged results lead each test; the rest follow alphabetically.
  for (const rows of rowsBySession.values()) {
    rows.sort(
      (a, b) =>
        Number(needsAttention(b.status)) - Number(needsAttention(a.status)) ||
        a.name.localeCompare(b.name),
    );
  }

  type Entry =
    | { kind: "session"; date: string; session: TestSession }
    | { kind: "event"; date: string; event: LifeEvent };
  const entries: Entry[] = [
    ...sessions.map((s) => ({ kind: "session" as const, date: s.date, session: s })),
    ...events.map((e) => ({ kind: "event" as const, date: e.date, event: e })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const years: { year: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const year = e.date.slice(0, 4);
    const last = years[years.length - 1];
    if (last && last.year === year) last.entries.push(e);
    else years.push({ year, entries: [e] });
  }
  const newestSessionId = sessions[0]?.id;

  return (
    <div className="space-y-8">
      <Reveal as="header">
        <h1 className="display text-[1.75rem] text-ink sm:text-[2rem]">Timeline</h1>
        <p className="mt-1.5 text-sm text-ink-3">
          {profile.name} · {sessions.length} test{sessions.length === 1 ? "" : "s"}
          {events.length > 0 && ` · ${events.length} life event${events.length === 1 ? "" : "s"}`}
        </p>
      </Reveal>

      {!ctx.readOnly && (
        <Reveal delay={60}>
          <details className="acc card overflow-hidden">
            <summary className="flex items-center gap-3 px-5 py-4">
              <Flag className="size-4 text-ink-3" aria-hidden />
              <span className="flex-1 text-sm font-medium text-ink">
                Add a life event
                <span className="ml-2 font-normal text-ink-3">
                  a new medication, a diet change, surgery
                </span>
              </span>
              <Plus className="acc-mark size-4 text-ink-3" aria-hidden />
            </summary>
            <form
              action={addLifeEvent}
              className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-4"
            >
              <input type="hidden" name="profileId" value={profile.id} />
              <div>
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  name="date"
                  type="date"
                  defaultValue={todayISO()}
                  required
                  className="w-40"
                />
              </div>
              <div className="min-w-48 flex-1">
                <Label htmlFor="event-label">What happened</Label>
                <Input
                  id="event-label"
                  name="label"
                  required
                  placeholder="Started vitamin D 2000 IU"
                />
              </div>
              <Button type="submit" variant="secondary">
                Add event
              </Button>
            </form>
          </details>
        </Reveal>
      )}

      {entries.length === 0 ? (
        <div className="card px-5 py-12 text-center text-sm text-ink-2">
          Nothing here yet. Your first test will appear as soon as you add it.
        </div>
      ) : (
        years.map(({ year, entries: yearEntries }, yi) => (
          <Reveal as="section" key={year} delay={yi === 0 ? 120 : 0}>
            <h2 className="eyebrow">{year}</h2>
            <ol className="mt-3 space-y-3 border-l border-line-strong pl-5 sm:ml-1 sm:pl-7">
              {yearEntries.map((entry) =>
                entry.kind === "event" ? (
                  <li key={entry.event.id} className="relative flex flex-wrap items-center gap-x-3 gap-y-1 py-1">
                    <RailMark kind="event" />
                    <span className="text-xs text-ink-3 tnum">{formatDate(entry.date)}</span>
                    <span className="text-sm font-medium text-ink">{entry.event.label}</span>
                    {!ctx.readOnly && (
                      <form action={deleteLifeEvent}>
                        <input type="hidden" name="id" value={entry.event.id} />
                        <button
                          type="submit"
                          className="cursor-pointer text-xs text-ink-3 underline-offset-2 transition-colors duration-300 hover:text-out-ink hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                ) : (
                  <li key={entry.session.id} className="relative">
                    <RailMark kind="session" />
                    <SessionCard
                      ctx={ctx}
                      session={entry.session}
                      rows={rowsBySession.get(entry.session.id) ?? []}
                      open={entry.session.id === newestSessionId}
                    />
                  </li>
                ),
              )}
            </ol>
          </Reveal>
        ))
      )}
    </div>
  );
}

function RailMark({ kind }: { kind: "session" | "event" }) {
  return (
    <span
      aria-hidden
      className={
        kind === "session"
          ? "absolute -left-[25px] top-[22px] size-[9px] rounded-full bg-ink ring-4 ring-page sm:-left-[33px]"
          : "absolute -left-[25px] top-1/2 size-[9px] -translate-y-1/2 rounded-full border-2 border-ink-3 bg-page ring-4 ring-page sm:-left-[33px]"
      }
    />
  );
}

function SessionCard({
  ctx,
  session,
  rows,
  open,
}: {
  ctx: ViewCtx;
  session: TestSession;
  rows: Row[];
  open: boolean;
}) {
  const out = rows.filter((r) => statusTone(r.status) === "out").length;
  const borderline = rows.filter((r) => statusTone(r.status) === "borderline").length;
  return (
    <details name="timeline" className="acc card overflow-hidden" open={open}>
      <summary className="row-link flex items-center gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="row-title text-[0.9375rem] font-medium text-ink">
            {formatDate(session.date)}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink-3">
            {[session.labName, session.fasting ? "fasting" : null, `${rows.length} results`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm text-ink-2 tnum">
          {out > 0 && (
            <span className="inline-flex items-center gap-1.5" title={`${out} out of range`}>
              <StatusGlyph status="HIGH" />
              {out}
              <span className="sr-only">out of range</span>
            </span>
          )}
          {borderline > 0 && (
            <span className="inline-flex items-center gap-1.5" title={`${borderline} borderline`}>
              <StatusGlyph status="BORDERLINE_HIGH" />
              {borderline}
              <span className="sr-only">borderline</span>
            </span>
          )}
          {out === 0 && borderline === 0 && rows.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-ink-3">
              <StatusGlyph status="IN_RANGE" />
              all in range
            </span>
          )}
        </div>
        <Plus className="acc-mark size-4 shrink-0 text-ink-3" aria-hidden />
      </summary>
      <div className="border-t border-line">
        {session.notes && (
          <p className="max-w-[640px] px-5 pt-4 text-sm leading-relaxed text-ink-2">
            {session.notes}
          </p>
        )}
        <ul className="divide-y divide-line px-5 py-1">
          {rows.map((r) => (
            <li key={r.resultId} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                href={`${ctx.base}/biomarkers/${r.biomarkerId}`}
                className="truncate text-sm text-ink transition-colors duration-300 hover:text-brand"
              >
                {r.name}
              </Link>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium text-ink tnum">
                  {r.valueLabel} <span className="unit font-normal">{r.unit}</span>
                </span>
                <span className="hidden w-[8.25rem] sm:block">
                  <StatusBadge status={r.status} />
                </span>
                <StatusGlyph status={r.status} className="sm:hidden" />
              </span>
            </li>
          ))}
        </ul>
        {!ctx.readOnly && (
          <form action={deleteSession} className="border-t border-line px-5 py-3">
            <input type="hidden" name="id" value={session.id} />
            <button
              type="submit"
              className="cursor-pointer text-xs text-ink-3 underline-offset-2 transition-colors duration-300 hover:text-out-ink hover:underline"
            >
              Delete this test and its {rows.length} results
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
