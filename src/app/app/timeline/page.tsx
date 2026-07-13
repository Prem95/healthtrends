import Link from "next/link";
import {
  getActiveProfile,
  getBiomarkers,
  getLifeEvents,
  getResults,
  getSessions,
} from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { addLifeEvent, deleteLifeEvent, deleteSession } from "@/app/app/actions";
import { StatusBadge, Badge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Reveal } from "@/components/motion/reveal";
import { formatDate, formatNumber, todayISO } from "@/lib/utils";

/*
  The timeline as the handoff's numbered accordion: hairline-divided rows
  with a mono index, one session open at a time (native exclusive details),
  the + marker rotating to × when open. Life events sit inline as dated rows.
*/
export default async function TimelinePage() {
  const profile = (await getActiveProfile())!;
  const [sessions, results, biomarkers, events] = await Promise.all([
    getSessions(profile.id),
    getResults(profile.id),
    getBiomarkers(),
    getLifeEvents(profile.id),
  ]);

  const summaries = summarize(results, biomarkers, profile.sex);
  const pointsBySession = new Map<string, { name: string; unit: string; value: number; status: import("@/lib/domain").ResultStatus; resultId: string; biomarkerId: string }[]>();
  for (const s of summaries) {
    for (const p of s.points) {
      if (!pointsBySession.has(p.sessionId)) pointsBySession.set(p.sessionId, []);
      pointsBySession.get(p.sessionId)!.push({
        name: s.biomarker.name,
        unit: s.biomarker.canonicalUnit,
        value: p.value,
        status: p.status,
        resultId: p.resultId,
        biomarkerId: s.biomarker.id,
      });
    }
  }

  // Merge sessions + life events into one chronological stream (newest first).
  type Entry =
    | { kind: "session"; date: string; session: (typeof sessions)[number] }
    | { kind: "event"; date: string; event: (typeof events)[number] };
  const entries: Entry[] = [
    ...sessions.map((s) => ({ kind: "session" as const, date: s.date, session: s })),
    ...events.map((e) => ({ kind: "event" as const, date: e.date, event: e })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Number sessions like the handoff's accordion index (01. is the newest);
  // precomputed so render stays pure.
  const sessionOrdinal = new Map<string, number>();
  {
    let i = 0;
    for (const e of entries) {
      if (e.kind === "session") sessionOrdinal.set(e.session.id, ++i);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <Reveal as="header">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="au-mono text-[13px] text-ink">Timeline</h1>
          <Link
            href="/app/sessions/new"
            className="au-mono text-[12px] text-brand transition-colors duration-300 hover:text-brand-strong"
          >
            + New test
          </Link>
        </div>
        <p className="au-mono mt-2 text-[11px] text-ink-3">
          {profile.name} · every session and life event, newest first
        </p>
      </Reveal>

      {/* Add life event: inline, no modal */}
      <Reveal delay={80}>
        <details className="au-acc au-card overflow-hidden rounded-xl">
          <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
            <span className="au-acc-plus au-mono text-[14px] text-ink-3" aria-hidden>
              +
            </span>
            <span className="au-mono text-[12px] text-ink-2">
              Add a life event · started statin, began keto, post-surgery
            </span>
          </summary>
          <form
            action={addLifeEvent}
            className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-4"
          >
            <input type="hidden" name="profileId" value={profile.id} />
            <div>
              <Label htmlFor="event-date">Date</Label>
              <Input id="event-date" name="date" type="date" defaultValue={todayISO()} required className="w-40" />
            </div>
            <div className="min-w-48 flex-1">
              <Label htmlFor="event-label">What happened</Label>
              <Input id="event-label" name="label" required placeholder="Started vitamin D 2000 IU" />
            </div>
            <Button type="submit" variant="secondary" size="md">
              Add event
            </Button>
          </form>
        </details>
      </Reveal>

      {entries.length === 0 ? (
        <p className="text-sm text-ink-3">Nothing here yet. Add your first test session.</p>
      ) : (
        <Reveal delay={140}>
          <ul>
            {entries.map((entry) => {
              if (entry.kind === "event") {
                return (
                  <li
                    key={entry.event.id}
                    className="flex flex-wrap items-center gap-3 border-t border-line py-3.5 pl-[calc(2.5rem+12px)] sm:pl-[52px]"
                  >
                    <span className="au-mono w-16 shrink-0 text-[11px] text-ink-3 tnum">
                      {formatDate(entry.date)}
                    </span>
                    <Badge tone="brand">{entry.event.label}</Badge>
                    <form action={deleteLifeEvent}>
                      <input type="hidden" name="id" value={entry.event.id} />
                      <button
                        type="submit"
                        className="au-mono cursor-pointer text-[10px] text-ink-3 transition-colors duration-300 hover:text-out"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                );
              }

              const ordinal = sessionOrdinal.get(entry.session.id)!;
              const rows = pointsBySession.get(entry.session.id) ?? [];
              const num = String(ordinal).padStart(2, "0");
              return (
                <li key={entry.session.id} className="border-t border-line">
                  <details name="timeline" className="au-acc group" open={ordinal === 1}>
                    <summary className="au-row flex cursor-pointer items-baseline gap-3 py-4 sm:gap-5">
                      <span className="au-num w-8 shrink-0 text-[13px] text-ink-3/70">
                        {num}.
                      </span>
                      <span className="au-row-title min-w-0 flex-1 text-[17px] font-medium text-ink">
                        {formatDate(entry.date)}
                        {entry.session.labName && (
                          <span className="ml-2 text-[13px] font-normal text-ink-3">
                            {entry.session.labName}
                          </span>
                        )}
                      </span>
                      {entry.session.fasting && (
                        <span className="au-mono hidden text-[10px] text-ink-3 sm:inline">
                          Fasting
                        </span>
                      )}
                      <span className="au-mono shrink-0 text-[11px] text-ink-3">
                        {rows.length} results
                      </span>
                      <span className="au-acc-plus au-mono shrink-0 text-[14px] text-ink-3" aria-hidden>
                        +
                      </span>
                    </summary>
                    <div className="pb-5 pl-8 sm:pl-[52px]">
                      {entry.session.notes && (
                        <p className="mb-3 max-w-[640px] text-sm leading-relaxed text-ink-2">
                          {entry.session.notes}
                        </p>
                      )}
                      <ul>
                        {rows.map((r) => (
                          <li
                            key={r.resultId}
                            className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
                          >
                            <Link
                              href={`/app/biomarkers/${r.biomarkerId}`}
                              className="truncate text-sm text-ink transition-colors duration-300 hover:text-brand"
                            >
                              {r.name}
                            </Link>
                            <span className="flex shrink-0 items-center gap-3">
                              <span className="au-num text-[13px] text-ink-2">
                                {formatNumber(r.value)} {r.unit}
                              </span>
                              <StatusBadge status={r.status} />
                            </span>
                          </li>
                        ))}
                      </ul>
                      <form action={deleteSession} className="mt-4 border-t border-line pt-3">
                        <input type="hidden" name="id" value={entry.session.id} />
                        <button
                          type="submit"
                          className="au-mono cursor-pointer text-[10px] text-ink-3 transition-colors duration-300 hover:text-out"
                        >
                          Delete this session and its {rows.length} results
                        </button>
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </Reveal>
      )}
    </div>
  );
}
