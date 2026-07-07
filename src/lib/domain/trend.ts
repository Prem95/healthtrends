import type { TrendDirection } from "./types";

export const TREND_MIN_CHANGE_FRACTION = 0.1;

export type TrendPoint = { date: string; value: number };

export type TrendSummary = {
  direction: TrendDirection;
  latest: number | null;
  previous: number | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  count: number;
};

/**
 * Trend rule (v1, deliberately simple, per product PRD §6/C3):
 *   - Sort points by date ascending.
 *   - Fewer than 2 points → INSUFFICIENT_DATA.
 *   - Look at the last 3 consecutive values: if strictly monotonic AND the
 *     total change across them is ≥ 10% of the first of the three → RISING /
 *     FALLING. Otherwise STABLE.
 * No statistical modelling in v1.
 */
export function computeTrend(
  points: TrendPoint[],
  minChangeFraction: number = TREND_MIN_CHANGE_FRACTION,
): TrendSummary {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const count = sorted.length;

  const latest = count >= 1 ? sorted[count - 1].value : null;
  const previous = count >= 2 ? sorted[count - 2].value : null;
  const deltaAbs = latest != null && previous != null ? latest - previous : null;
  const deltaPct =
    deltaAbs != null && previous != null && previous !== 0
      ? (deltaAbs / Math.abs(previous)) * 100
      : null;

  if (count < 2) {
    return { direction: "INSUFFICIENT_DATA", latest, previous, deltaAbs, deltaPct, count };
  }

  let direction: TrendDirection = "STABLE";
  if (count >= 3) {
    const [a, b, c] = sorted.slice(count - 3).map((p) => p.value);
    const rising = c > b && b > a;
    const falling = c < b && b < a;
    const base = Math.abs(a);
    const totalChangeFraction = base === 0 ? Infinity : Math.abs(c - a) / base;
    if ((rising || falling) && totalChangeFraction >= minChangeFraction) {
      direction = rising ? "RISING" : "FALLING";
    }
  }

  return { direction, latest, previous, deltaAbs, deltaPct, count };
}

export const TREND_LABEL: Record<TrendDirection, string> = {
  RISING: "Trending up",
  FALLING: "Trending down",
  STABLE: "Holding steady",
  INSUFFICIENT_DATA: "Not enough data",
};
