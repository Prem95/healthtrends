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
 * A unit is displayable for a biomarker when it is the canonical unit or one of
 * its known alternates. Used to validate a stored/selected display preference.
 */
export function isDisplayableUnit(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  unit: string,
): boolean {
  return conversionFactor(biomarker, unit) != null;
}

/**
 * Resolve which unit to render a biomarker's values in: the user's preference
 * when it is still valid for this marker, otherwise the canonical unit.
 */
export function resolveDisplayUnit(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  preferred: string | undefined | null,
): string {
  if (preferred && isDisplayableUnit(biomarker, preferred)) return preferred;
  return biomarker.canonicalUnit;
}

/**
 * Decimals to show for a measured value, chosen by magnitude so a converted
 * reading keeps meaningful precision without trailing noise (5.4 mmol/L, not
 * 5 or 5.42; 99 mg/dL, not 99.00).
 */
export function measuredDecimals(displayValue: number): number {
  const a = Math.abs(displayValue);
  if (a === 0) return 0;
  if (a < 1) return 3;
  if (a < 10) return 2;
  if (a < 100) return 1;
  return 0;
}

/** Format a value already expressed in its display unit, magnitude-aware. */
export function formatMeasured(displayValue: number): string {
  if (!Number.isFinite(displayValue)) return "n/a";
  const decimals = measuredDecimals(displayValue);
  const rounded = Number(displayValue.toFixed(decimals));
  return rounded.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Convert a canonical value into `displayUnit` and format it. Falls back to the
 * canonical unit when `displayUnit` is unknown for this biomarker.
 */
export function formatInUnit(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  canonicalValue: number,
  displayUnit: string,
): string {
  const unit = resolveDisplayUnit(biomarker, displayUnit);
  return formatMeasured(fromCanonical(biomarker, canonicalValue, unit));
}

/**
 * Convert a canonical range's bounds into a display unit. Linear conversion, so
 * status/ordering are unaffected — this is for labels only.
 */
export function rangeInUnit(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  range: RefRange | null | undefined,
  displayUnit: string,
): RefRange | null {
  if (!range || (range.min == null && range.max == null)) return null;
  const unit = resolveDisplayUnit(biomarker, displayUnit);
  const out: RefRange = {};
  if (range.min != null) out.min = fromCanonical(biomarker, range.min, unit);
  if (range.max != null) out.max = fromCanonical(biomarker, range.max, unit);
  return out;
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
