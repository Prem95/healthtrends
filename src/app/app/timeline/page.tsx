import Link from "next/link";
import { CalendarPlus, FlaskConical } from "lucide-react";
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
import { formatDate, formatNumber, todayISO } from "@/lib/utils";

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

  return (
    <div className="animate-rise space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="au-hl text-3xl text-ink">Timeline</h1>
          <p className="mt-1 text-sm text-ink-2">
            Every session and life event for {profile.name}, newest first.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/app/sessions/new">
            <FlaskConical /> New test session
          </Link>
        </Button>
      </header>

      {/* Add life event: inline, no modal */}
      <details className="group rounded-lg border border-line bg-paper">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-ink-2 hover:text-ink">
          <CalendarPlus className="size-4" />
          Add a life event: started statin, began keto, post-surgery
        </summary>
        <form action={addLifeEvent} className="flex flex-wrap items-end gap-3 border-t border-line px-4 py-4">
          <input type="hidden" name="profileId" value={profile.id} />
          <div>
            <Label htmlFor="event-date">Date</Label>
            <Input id="event-date" name="date" type="date" defaultValue={todayISO()} required className="w-40" />
          </div>
          <div className="min-w-48 flex-1">
            <Label htmlFor="event-label">What happened</Label>
            <Input id="event-label" name="label" required placeholder="Started vitamin D 2000 IU" />
          </div>
          <Button type="submit" size="md">Add event</Button>
        </form>
      </details>

      {entries.length === 0 ? (
        <p className="text-sm text-ink-3">Nothing here yet. Add your first test session.</p>
      ) : (
        <ol className="relative space-y-6 border-l border-line-strong pl-6">
          {entries.map((entry) => (
            <li key={entry.kind === "session" ? entry.session.id : entry.event.id} className="relative">
              <span
                className={
                  "absolute -left-[1.72rem] top-1.5 size-3 rounded-none border-2 " +
                  (entry.kind === "session"
                    ? "border-brand bg-paper"
                    : "border-line-strong bg-brand-soft")
                }
              />
              {entry.kind === "event" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-ink-3 tnum">{formatDate(entry.date)}</span>
                  <Badge tone="brand">{entry.event.label}</Badge>
                  <form action={deleteLifeEvent}>
                    <input type="hidden" name="id" value={entry.event.id} />
                    <button type="submit" className="text-xs text-ink-3 hover:text-out">
                      remove
                    </button>
                  </form>
                </div>
              ) : (
                <details className="rounded-lg border border-line bg-paper">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="font-medium text-ink tnum">{formatDate(entry.date)}</span>
                      {entry.session.labName && (
                        <span className="text-sm text-ink-3">{entry.session.labName}</span>
                      )}
                      {entry.session.fasting && <Badge>Fasting</Badge>}
                    </span>
                    <span className="text-xs text-ink-3">
                      {(pointsBySession.get(entry.session.id) ?? []).length} results
                    </span>
                  </summary>
                  <div className="border-t border-line px-4 py-3">
                    {entry.session.notes && (
                      <p className="mb-3 text-sm text-ink-2">{entry.session.notes}</p>
                    )}
                    <ul className="divide-y divide-line">
                      {(pointsBySession.get(entry.session.id) ?? []).map((r) => (
                        <li key={r.resultId} className="flex items-center justify-between py-2">
                          <Link
                            href={`/app/biomarkers/${r.biomarkerId}`}
                            className="text-sm text-ink hover:text-brand-strong"
                          >
                            {r.name}
                          </Link>
                          <span className="flex items-center gap-3">
                            <span className="tnum text-sm text-ink-2">
                              {formatNumber(r.value)} {r.unit}
                            </span>
                            <StatusBadge status={r.status} />
                          </span>
                        </li>
                      ))}
                    </ul>
                    <form action={deleteSession} className="mt-3 border-t border-line pt-3">
                      <input type="hidden" name="id" value={entry.session.id} />
                      <button
                        type="submit"
                        className="text-xs text-ink-3 hover:text-out"
                      >
                        Delete this session and its {(pointsBySession.get(entry.session.id) ?? []).length} results
                      </button>
                    </form>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
