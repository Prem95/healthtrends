import {
  computeStatus,
  computeTrend,
  resolveRange,
  type Biomarker,
  type RefRange,
  type ResultStatus,
  type Sex,
  type TrendSummary,
} from "@/lib/domain";
import type { ResultWithSession } from "@/lib/data";

export type SeriesPoint = {
  resultId: string;
  sessionId: string;
  date: string; // session date
  createdAt?: string;
  value: number; // canonical
  enteredUnit: string;
  status: ResultStatus;
  appliedRange: RefRange | null;
  labName?: string;
};

export type BiomarkerSummary = {
  biomarker: Biomarker;
  points: SeriesPoint[];
  latest: SeriesPoint | null;
  latestStatus: ResultStatus;
  trend: TrendSummary;
  /** Range used for the chart band — the most recent applicable range. */
  bandRange: RefRange | null;
  ambiguousSex: boolean;
  sexBands?: RefRange[];
};

/**
 * Build per-biomarker summaries from a flat list of results. Pure: all domain
 * rules (status, trend, range resolution) are applied here at read time.
 */
export function summarize(
  results: ResultWithSession[],
  biomarkers: (Biomarker & { archived?: boolean })[],
  profileSex: Sex,
  fraction?: number,
): BiomarkerSummary[] {
  const byId = new Map<string, Biomarker & { archived?: boolean }>();
  for (const b of biomarkers) byId.set(b.id, b);

  const grouped = new Map<string, ResultWithSession[]>();
  for (const r of results) {
    if (!grouped.has(r.biomarkerId)) grouped.set(r.biomarkerId, []);
    grouped.get(r.biomarkerId)!.push(r);
  }

  const out: BiomarkerSummary[] = [];
  for (const [biomarkerId, rows] of grouped) {
    const biomarker = byId.get(biomarkerId);
    if (!biomarker) continue;

    const sorted = [...rows].sort((a, b) => {
      const d = a.sessionDate.localeCompare(b.sessionDate);
      if (d !== 0) return d;
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    });

    const points: SeriesPoint[] = sorted.map((r) => {
      const { status, appliedRange } = computeStatus({
        value: r.value,
        labRange: r.labRange,
        biomarker,
        profileSex,
        fraction,
      });
      return {
        resultId: r.id,
        sessionId: r.sessionId,
        date: r.sessionDate,
        createdAt: r.createdAt,
        value: r.value,
        enteredUnit: r.enteredUnit,
        status,
        appliedRange,
        labName: r.labName,
      };
    });

    const latest = points.length ? points[points.length - 1] : null;
    const trend = computeTrend(points.map((p) => ({ date: p.date, value: p.value })));

    // Band uses the most recent applicable range. Fall back to catalog if the
    // latest point had no lab range.
    const resolved = resolveRange(latest?.appliedRange ?? null, biomarker.defaultRanges, profileSex);
    const bandRange = latest?.appliedRange ?? resolved.range;

    out.push({
      biomarker,
      points,
      latest,
      latestStatus: latest?.status ?? "NO_RANGE",
      trend,
      bandRange,
      ambiguousSex: resolved.ambiguousSex,
      sexBands: resolved.sexBands,
    });
  }

  return out.sort((a, b) => a.biomarker.name.localeCompare(b.biomarker.name));
}

const OUT_OF_RANGE: ResultStatus[] = ["LOW", "HIGH"];
const BORDERLINE: ResultStatus[] = ["BORDERLINE_LOW", "BORDERLINE_HIGH"];

export function isOutOfRange(s: ResultStatus) {
  return OUT_OF_RANGE.includes(s);
}
export function isBorderline(s: ResultStatus) {
  return BORDERLINE.includes(s);
}
