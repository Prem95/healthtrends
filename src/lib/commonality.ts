import type { BiomarkerCategory } from "@/lib/domain";

/**
 * Ordering by how commonly a marker is ordered/looked at, so the most familiar
 * results surface first (glucose, cholesterol, a CBC) ahead of niche assays
 * (tumour markers, rheumatoid factor). Lower rank = more common = shown first.
 * Ids not listed fall back to a large rank and then sort by name.
 */
const MARKER_RANK: Record<string, number> = {
  // everyday panels people recognise
  "fasting-glucose": 1,
  hba1c: 2,
  "total-cholesterol": 3,
  "ldl-cholesterol": 4,
  "hdl-cholesterol": 5,
  triglycerides: 6,
  "non-hdl-cholesterol": 7,
  hemoglobin: 8,
  hematocrit: 9,
  "white-blood-cells": 10,
  "red-blood-cells": 11,
  platelets: 12,
  "vitamin-d": 13,
  "vitamin-b12": 14,
  ferritin: 15,
  tsh: 16,
  "free-t4": 17,
  creatinine: 18,
  egfr: 19,
  sodium: 20,
  potassium: 21,
  alt: 22,
  ast: 23,
  "alkaline-phosphatase": 24,
  albumin: 25,
  "total-bilirubin": 26,
  calcium: 27,
  "uric-acid": 28,
  "hs-crp": 29,
};

const FALLBACK = 1000;

export function markerRank(id: string): number {
  return MARKER_RANK[id] ?? FALLBACK;
}

/** Sort a list of markers most-common first, then alphabetically. */
export function sortByCommonality<T extends { id: string; name: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const ra = markerRank(a.id);
    const rb = markerRank(b.id);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Category order for grouped lists: the panels most people get first.
 */
export const CATEGORY_COMMON_ORDER: BiomarkerCategory[] = [
  "GLUCOSE",
  "LIPIDS",
  "CBC",
  "LIVER",
  "KIDNEY",
  "THYROID",
  "IRON",
  "VITAMINS",
  "HORMONES",
  "OTHER",
];

export function categoryRank(c: BiomarkerCategory): number {
  const i = CATEGORY_COMMON_ORDER.indexOf(c);
  return i === -1 ? FALLBACK : i;
}
