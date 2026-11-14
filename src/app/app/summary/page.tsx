import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getActiveProfile,
  getBiomarkers,
  getCustomRanges,
  getResults,
  getUnitPreferences,
  getUser,
} from "@/lib/data";
import { getPlan } from "@/lib/entitlements";
import { summarize } from "@/lib/analytics";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";
import { ArrowLeft } from "lucide-react";
import { StatusBadge, StatusGlyph } from "@/components/ui/status-badge";
import { Reveal } from "@/components/motion/reveal";
import { formatDate, prettyUnit } from "@/lib/utils";
import {
  STATUS_LABEL,
  formatInUnit,
  formatMeasured,
  rangeInUnit,
  resolveDisplayUnit,
  statusTone,
  type RefRange,
} from "@/lib/domain";
import { PrintButton } from "@/components/summary/print-button";

// Formats a range whose bounds are already in the display unit.
function fmtRange(r: RefRange | null): string {
  if (!r || (r.min == null && r.max == null)) return "—";
  if (r.min != null && r.max != null) return `${formatMeasured(r.min)}–${formatMeasured(r.max)}`;
  if (r.max != null) return `under ${formatMeasured(r.max)}`;
  return `over ${formatMeasured(r.min!)}`;
}

/**
 * Doctor summary (Pro): flagged markers first, then the full table, then
 * print. Server-side gated with getPlan — the same helper used by
 * UI gating, so client tricks can't reach it. The shell chrome is hidden when
 * printing, so the page goes out as ink on paper.
 */
export default async function DoctorSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login?next=/app/summary");
  const plan = await getPlan(user.id);
  if (!plan.limits.doctorSummary) redirect("/app/settings?upgrade=doctor_summary");

  const { window: windowParam } = await searchParams;
  const months = windowParam === "6m" ? 6 : windowParam === "3y" ? 36 : windowParam === "all" ? null : 12;

  const profile = (await getActiveProfile())!;
  const [biomarkers, results, unitPrefs, customRanges] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);

  const cutoff = months
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - months);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  const filtered = cutoff ? results.filter((r) => r.sessionDate >= cutoff) : results;
  const summaries = summarize(filtered, biomarkers, profile.sex, customRanges).filter(
    (s) => s.latest,
  );
  const flagged = summaries
    .filter((s) => statusTone(s.latestStatus) !== "in-range" && statusTone(s.latestStatus) !== "neutral")
    .sort((a, b) => (statusTone(a.latestStatus) === "out" ? -1 : 1) - (statusTone(b.latestStatus) === "out" ? -1 : 1));
  const latestDate = summaries.reduce<string | null>(
    (acc, s) => (acc && acc > s.latest!.date ? acc : s.latest!.date),
    null,
  );

  const windows = [
    { key: "6m", label: "6M" },
    { key: "1y", label: "1Y" },
    { key: "3y", label: "3Y" },
    { key: "all", label: "All" },
  ];
  const activeWindow = windowParam ?? "1y";

  return (
    <div>
      <Reveal className="mb-7 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors duration-300 hover:text-brand"
        >
          <ArrowLeft className="size-4" aria-hidden /> Overview
        </Link>
        <div className="seg" role="group" aria-label="Time window">
          {windows.map((w) => (
            <Link
              key={w.key}
              href={`/app/summary?window=${w.key}`}
              aria-current={activeWindow === w.key ? "true" : undefined}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal as="header" delay={60}>
        <p className="eyebrow">Doctor summary</p>
        <h1 className="display mt-3 text-[1.75rem] text-ink sm:text-[2rem]">
          {profile.name}&rsquo;s results, on one page
        </h1>
        <p className="mt-2 text-sm text-ink-3">
          {summaries.length} marker{summaries.length === 1 ? "" : "s"}
          {latestDate && <> · latest test {formatDate(latestDate)}</>}
          {" · "}
          {months ? `last ${months} months` : "all recorded history"}
        </p>
      </Reveal>

      {summaries.length === 0 ? (
        <p className="card mt-8 px-5 py-10 text-center text-sm text-ink-2">
          No results in this window. Try a longer one.
        </p>
      ) : (
        <>
          {flagged.length > 0 && (
            <Reveal as="section" delay={120} className="card mt-8 overflow-hidden">
              <h2 className="px-5 pb-3 pt-5 text-base font-medium text-ink">
                Flagged for discussion{" "}
                <span className="ml-1 font-normal text-ink-3 tnum">{flagged.length}</span>
              </h2>
              <ul className="divide-y divide-line border-t border-line">
                {flagged.map((s) => {
                  const displayUnit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
                  return (
                    <li key={s.biomarker.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium text-ink">
                        {s.biomarker.name}
                      </span>
                      <span className="text-sm font-medium text-ink tnum">
                        {formatInUnit(s.biomarker, s.latest!.value, displayUnit)}{" "}
                        <span className="unit font-normal">{prettyUnit(displayUnit)}</span>
                      </span>
                      <span className="w-[8.25rem] shrink-0">
                        <StatusBadge status={s.latestStatus} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          )}

          <Reveal as="section" delay={180} className="card mt-6 overflow-hidden">
            <h2 className="px-5 pb-3 pt-5 text-base font-medium text-ink">
              All results in this window
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-paper-2 text-left text-xs text-ink-3">
                    {["Marker", "Latest", "Date", "Reference", "Status"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {summaries.map((s) => {
                    const displayUnit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
                    return (
                      <tr key={s.biomarker.id}>
                        <td className="py-2.5 pl-5 pr-3 font-medium text-ink">{s.biomarker.name}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-ink tnum">
                          {formatInUnit(s.biomarker, s.latest!.value, displayUnit)}{" "}
                          <span className="unit">{prettyUnit(displayUnit)}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-ink-2 tnum">
                          {formatDate(s.latest!.date)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-ink-2 tnum">
                          {fmtRange(rangeInUnit(s.biomarker, s.latest!.appliedRange, displayUnit))}
                        </td>
                        <td className="py-2.5 pl-3 pr-5 text-ink-2">
                          <span className="inline-flex items-center gap-2">
                            <StatusGlyph status={s.latestStatus} />
                            {STATUS_LABEL[s.latestStatus]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal delay={240} className="mt-7 flex flex-wrap items-center gap-4 print:hidden">
            <PrintButton />
            <p className="text-sm text-ink-3">
              Prints exactly this window, as ink on paper, from your own browser.
            </p>
          </Reveal>
        </>
      )}

      <footer className="mt-10 hidden border-t border-line pt-4 print:block">
        <p className="text-xs leading-relaxed text-ink-3">{DISCLAIMER_TEXT}</p>
      </footer>
    </div>
  );
}
