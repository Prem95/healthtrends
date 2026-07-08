import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getActiveProfile,
  getBiomarkers,
  getResults,
  getUser,
} from "@/lib/data";
import { getPlan } from "@/lib/entitlements";
import { summarize } from "@/lib/analytics";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/utils";
import { STATUS_LABEL, TREND_LABEL, type RefRange } from "@/lib/domain";
import { PrintButton } from "@/components/summary/print-button";

function fmtRange(r: RefRange | null): string {
  if (!r || (r.min == null && r.max == null)) return "n/a";
  if (r.min != null && r.max != null) return `${formatNumber(r.min)}–${formatNumber(r.max)}`;
  if (r.max != null) return `< ${formatNumber(r.max)}`;
  return `> ${formatNumber(r.min!)}`;
}

/**
 * Doctor-ready printable summary (Pro). Server-side gated with getPlan — the
 * same helper used by UI gating, so client tricks can't reach it.
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
  const [biomarkers, results] = await Promise.all([getBiomarkers(), getResults(profile.id)]);

  const cutoff = months
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - months);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  const filtered = cutoff ? results.filter((r) => r.sessionDate >= cutoff) : results;
  const summaries = summarize(filtered, biomarkers, profile.sex).filter((s) => s.latest);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
          <ArrowLeft className="size-3.5" /> Dashboard
        </Link>
        <div className="flex items-center gap-2">
          {[
            { key: "6m", label: "6 months" },
            { key: "1y", label: "12 months" },
            { key: "3y", label: "3 years" },
            { key: "all", label: "All time" },
          ].map((w) => (
            <Button
              key={w.key}
              asChild
              variant={(windowParam ?? "1y") === w.key ? "subtle" : "ghost"}
              size="sm"
            >
              <Link href={`/app/summary?window=${w.key}`}>{w.label}</Link>
            </Button>
          ))}
          <PrintButton />
        </div>
      </div>

      <header className="border-b-2 border-ink pb-4">
        <h1 className="au-hl text-2xl text-ink">Lab result summary: {profile.name}</h1>
        <p className="mt-1 text-sm text-ink-2">
          {profile.sex === "M" ? "Male" : profile.sex === "F" ? "Female" : "Sex not specified"}
          {profile.dateOfBirth && <> · DOB {formatDate(profile.dateOfBirth)}</>}
          {" · "}
          {months ? `Last ${months} months` : "All recorded history"} · Prepared{" "}
          {formatDate(new Date().toISOString())}
        </p>
      </header>

      {summaries.length === 0 ? (
        <p className="py-10 text-sm text-ink-2">No results in this window.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left text-xs tracking-wide text-ink-3 uppercase">
              <th className="py-2 pr-3 font-medium">Marker</th>
              <th className="py-2 pr-3 font-medium">Latest</th>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Reference</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {summaries.map((s) => (
              <tr key={s.biomarker.id}>
                <td className="py-2 pr-3 font-medium text-ink">{s.biomarker.name}</td>
                <td className="py-2 pr-3 tnum text-ink">
                  {formatNumber(s.latest!.value)} {s.biomarker.canonicalUnit}
                </td>
                <td className="py-2 pr-3 tnum text-ink-2">{formatDate(s.latest!.date)}</td>
                <td className="py-2 pr-3 tnum text-ink-2">{fmtRange(s.latest!.appliedRange)}</td>
                <td className="py-2 pr-3 text-ink-2">{STATUS_LABEL[s.latestStatus]}</td>
                <td className="py-2 text-ink-2">
                  {TREND_LABEL[s.trend.direction]}
                  {s.trend.deltaPct != null && (
                    <span className="tnum">
                      {" "}
                      ({s.trend.deltaPct > 0 ? "+" : ""}
                      {formatNumber(s.trend.deltaPct, 1)}%)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-8 border-t border-line pt-4">
        <p className="text-xs leading-relaxed text-ink-3">{DISCLAIMER_TEXT}</p>
      </footer>
    </div>
  );
}
