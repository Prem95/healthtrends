import type { BiomarkerSummary } from "@/lib/analytics";
import {
  conversionFactor,
  formatInUnit,
  formatDelta,
  resolveDisplayUnit,
  type BiomarkerCategory,
  type ResultStatus,
} from "@domain";

/**
 * Everything a list row or card needs to show one marker, as plain data (safe
 * to hand to client components). Values stay canonical; `displayFactor`
 * converts them for printing in `unit`.
 */
import { prettyUnit } from "@/lib/format";

export type MarkerDigest = {
  id: string;
  name: string;
  category: BiomarkerCategory;
  isCustom: boolean;
  /** Display label for the unit (typeset), not the stored unit key. */
  unit: string;
  displayFactor: number;
  count: number;
  value: number | null;
  valueLabel: string | null;
  date: string | null;
  status: ResultStatus;
  rangeMin?: number;
  rangeMax?: number;
  spark: number[];
  /** Signed change since the previous result, already formatted in `unit`. */
  deltaLabel: string | null;
  prevDate: string | null;
};

export function toDigest(s: BiomarkerSummary, unitPrefs: Record<string, string>): MarkerDigest {
  const unit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
  const displayFactor = conversionFactor(s.biomarker, unit) ?? 1;
  const prev = s.points.length >= 2 ? s.points[s.points.length - 2] : null;
  const delta = s.latest && prev ? s.latest.value - prev.value : null;
  return {
    id: s.biomarker.id,
    name: s.biomarker.name,
    category: s.biomarker.category,
    isCustom: s.biomarker.isCustom,
    unit: prettyUnit(unit),
    displayFactor,
    count: s.points.length,
    value: s.latest?.value ?? null,
    valueLabel: s.latest ? formatInUnit(s.biomarker, s.latest.value, unit) : null,
    date: s.latest?.date ?? null,
    status: s.latestStatus,
    rangeMin: s.bandRange?.min ?? undefined,
    rangeMax: s.bandRange?.max ?? undefined,
    spark: s.points.slice(-10).map((p) => p.value),
    deltaLabel:
      delta == null || delta === 0
        ? null
        : `${delta > 0 ? "↑" : "↓"} ${formatDelta(delta / displayFactor, s.latest!.value / displayFactor)}`,
    prevDate: prev?.date ?? null,
  };
}

/** Out of range first, then borderline, then by how far past the limit. */
export function attentionRank(d: MarkerDigest): number {
  const sev = d.status === "HIGH" || d.status === "LOW" ? 2 : d.status.startsWith("BORDERLINE") ? 1 : 0;
  let dist = 0;
  if (d.value != null) {
    if (d.rangeMax != null && d.value > d.rangeMax) {
      dist = (d.value - d.rangeMax) / (Math.abs(d.rangeMax) || 1);
    } else if (d.rangeMin != null && d.value < d.rangeMin) {
      dist = (d.rangeMin - d.value) / (Math.abs(d.rangeMin) || 1);
    }
  }
  return sev * 10 + Math.min(dist, 9);
}

export function needsAttention(status: ResultStatus): boolean {
  return status !== "IN_RANGE" && status !== "NO_RANGE";
}
