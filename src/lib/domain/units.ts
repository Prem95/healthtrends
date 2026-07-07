import type { Biomarker, RefRange } from "./types";

/**
 * Parse a user-typed number that may use `,` or `.` as the decimal separator.
 * Returns null when the string is not a finite number.
 */
export function parseDecimal(input: string): number | null {
  if (input == null) return null;
  const cleaned = String(input).trim().replace(/\s/g, "");
  if (cleaned === "") return null;
  // Normalise decimal comma → dot. If both separators appear, treat the last
  // one as the decimal separator and strip the rest as grouping.
  let normalised = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const groupSep = decimalSep === "," ? "." : ",";
    normalised = cleaned.split(groupSep).join("");
    normalised = normalised.replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    normalised = cleaned.replace(",", ".");
  }
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve the multiply-factor that converts a value in `unit` to the
 * biomarker's canonical unit. Returns 1 for the canonical unit itself,
 * and null for an unknown unit.
 */
export function conversionFactor(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  unit: string,
): number | null {
  const u = unit.trim().toLowerCase();
  if (u === biomarker.canonicalUnit.trim().toLowerCase()) return 1;
  const alt = biomarker.altUnits.find(
    (a) => a.unit.trim().toLowerCase() === u,
  );
  return alt ? alt.toCanonical : null;
}

/**
 * Convert an entered value (in `enteredUnit`) to the canonical unit.
 * Throws when the unit is unknown so callers must handle it explicitly.
 */
export function toCanonical(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  value: number,
  enteredUnit: string,
): number {
  const factor = conversionFactor(biomarker, enteredUnit);
  if (factor == null) {
    throw new Error(
      `Unknown unit "${enteredUnit}" for biomarker with canonical unit "${biomarker.canonicalUnit}"`,
    );
  }
  return value * factor;
}

/** Convert a canonical value to a display unit. */
export function fromCanonical(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  canonicalValue: number,
  displayUnit: string,
): number {
  const factor = conversionFactor(biomarker, displayUnit);
  if (factor == null) {
    throw new Error(
      `Unknown display unit "${displayUnit}" for biomarker with canonical unit "${biomarker.canonicalUnit}"`,
    );
  }
  return canonicalValue / factor;
}

/**
 * Midpoint of a canonical range, used as the plausibility anchor.
 * For one-sided ranges we use the single bound as the anchor.
 */
export function rangeMidpoint(range: RefRange | undefined | null): number | null {
  if (!range) return null;
  const { min, max } = range;
  if (min != null && max != null) return (min + max) / 2;
  if (max != null) return max;
  if (min != null) return min;
  return null;
}
