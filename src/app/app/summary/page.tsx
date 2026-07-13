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
import { StatusBadge } from "@/components/ui/status-badge";
import { Reveal } from "@/components/motion/reveal";
import { formatDate } from "@/lib/utils";
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
  if (!r || (r.min == null && r.max == null)) return "n/a";
  if (r.min != null && r.max != null) return `${formatMeasured(r.min)}–${formatMeasured(r.max)}`;
  if (r.max != null) return `< ${formatMeasured(r.max)}`;
  return `> ${formatMeasured(r.min!)}`;
}

/**
 * Consultation mode (Pro): flagged markers first, then the full table, then
 * one accent CTA. Server-side gated with getPlan — the same helper used by
 * UI gating, so client tricks can't reach it. Printing flips to ink-on-paper
 * via the print token override in globals.css.
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
    <div className="mx-auto max-w-3xl">
      <Reveal className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/app"
          className="au-mono text-[12px] text-ink-3 transition-colors duration-300 hover:text-brand"
        >
          ← Markers
        </Link>
        <div className="au-seg" role="group" aria-label="Time window">
          {windows.map((w) => (
            <Link
              key={w.key}
              href={`/app/summary?window=${w.key}`}
              role="button"
              aria-pressed={activeWindow === w.key}
              className={
                activeWindow === w.key
                  ? "rounded-[6px] bg-[color:var(--au-seg-on)] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.05em] text-ink"
                  : "rounded-[6px] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.05em] text-ink-3 transition-colors duration-300 hover:text-ink"
              }
            >
              {w.label}
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal as="header" delay={60}>
        <h1 className="au-hl max-w-[560px] text-[26px] leading-[1.15] tracking-[-0.02em] text-ink sm:text-[30px]">
          Everything your doctor asks for, on one screen.
        </h1>
        <p className="au-mono mt-3 text-[11px] text-ink-3">
          {profile.name} · {summaries.length} markers
          {latestDate && <> · updated {formatDate(latestDate)}</>}
          {" · "}
          {months ? `last ${months} months` : "all recorded history"}
        </p>
      </Reveal>

      {summaries.length === 0 ? (
        <p className="py-10 text-sm text-ink-2">No results in this window.</p>
      ) : (
        <>
          {flagged.length > 0 && (
            <Reveal delay={140}>
              <div className="au-card au-card--olive mt-8 rounded-2xl px-5 py-4">
                <p className="au-eyebrow text-[color:var(--au-olive-label)]">
                  Flagged for discussion
                </p>
                <ul>
                  {flagged.map((s) => (
                    <li
                      key={s.biomarker.id}
                      className="flex items-center gap-4 border-t border-[color:var(--au-olive-line)] py-3 first:mt-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                        {s.biomarker.name}
                      </span>
                      <span className="au-num text-[13px] text-ink">
                        {formatInUnit(
                          s.biomarker,
                          s.latest!.value,
                          resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]),
                        )}{" "}
                        <span className="text-ink-3">
                          {resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id])}
                        </span>
                      </span>
                      <StatusBadge status={s.latestStatus} />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}

          <Reveal delay={200}>
            <h2 className="au-eyebrow mt-10">All results in this window</h2>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left">
                  {["Marker", "Latest", "Date", "Reference", "Status"].map((h) => (
                    <th
                      key={h}
                      className="py-2 pr-3 font-mono text-[10px] font-medium uppercase tracking-[0.07em] text-ink-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => {
                  const displayUnit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
                  return (
                  <tr key={s.biomarker.id} className="border-b border-line">
                    <td className="py-2.5 pr-3 font-medium text-ink">{s.biomarker.name}</td>
                    <td className="py-2.5 pr-3 tnum text-ink">
                      {formatInUnit(s.biomarker, s.latest!.value, displayUnit)} {displayUnit}
                    </td>
                    <td className="py-2.5 pr-3 tnum text-ink-2">{formatDate(s.latest!.date)}</td>
                    <td className="py-2.5 pr-3 tnum text-ink-2">
                      {fmtRange(rangeInUnit(s.biomarker, s.latest!.appliedRange, displayUnit))}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-2">{STATUS_LABEL[s.latestStatus]}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </Reveal>

          <Reveal delay={260} className="mt-8 print:hidden">
            <PrintButton />
            <p className="au-mono mt-4 text-[11px] leading-[1.7] text-ink-3">
              Prints exactly this window · ink on paper
              <br />
              nothing leaves your device
            </p>
          </Reveal>
        </>
      )}

      <footer className="mt-10 border-t border-line pt-4">
        <p className="text-xs leading-relaxed text-ink-3">{DISCLAIMER_TEXT}</p>
      </footer>
    </div>
  );
}
