import type { Biomarker, RefRange } from "./types";
import { rangeMidpoint, toCanonical, conversionFactor } from "./units";

export const PLAUSIBILITY_LOW = 0.05;
export const PLAUSIBILITY_HIGH = 20;

export type PlausibilityResult = {
  plausible: boolean;
  /** The canonical value that would be stored. */
  canonicalValue: number | null;
  /** A suggested alternate unit whose conversion lands the value in range. */
  suggestion?: { unit: string; canonicalValue: number } | null;
  reason?: string;
};

/**
 * Plausibility check (product PRD §9.3.1): after converting an entered value
 * to canonical units, if it falls outside 0.05×–20× of the canonical range
 * midpoint we should prompt the user to confirm the unit rather than saving
 * silently. When an alternate unit would bring the value into a plausible
 * band, we surface it as a suggestion ("Did you mean X mmol/L?").
 */
export function checkPlausibility(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits" | "defaultRanges">,
  enteredValue: number,
  enteredUnit: string,
  anchorRange?: RefRange | null,
): PlausibilityResult {
  const factor = conversionFactor(biomarker, enteredUnit);
  if (factor == null) {
    return {
      plausible: false,
      canonicalValue: null,
      reason: `Unknown unit "${enteredUnit}".`,
    };
  }
  const canonicalValue = enteredValue * factor;

  const anchor =
    rangeMidpoint(anchorRange) ??
    rangeMidpoint(biomarker.defaultRanges?.find((r) => r.min != null || r.max != null));

  // No range to anchor against → we cannot judge plausibility; accept.
  if (anchor == null || anchor === 0) {
    return { plausible: true, canonicalValue, suggestion: null };
  }

  const ratio = canonicalValue / anchor;
  const plausible = ratio >= PLAUSIBILITY_LOW && ratio <= PLAUSIBILITY_HIGH;
  if (plausible) {
    return { plausible: true, canonicalValue, suggestion: null };
  }

  // Try each alternate unit to see if one lands the value near the anchor.
  let suggestion: PlausibilityResult["suggestion"] = null;
  for (const alt of biomarker.altUnits) {
    if (alt.unit.trim().toLowerCase() === enteredUnit.trim().toLowerCase()) continue;
    const candidate = toCanonical(biomarker, enteredValue, alt.unit);
    const candidateRatio = candidate / anchor;
    if (candidateRatio >= PLAUSIBILITY_LOW && candidateRatio <= PLAUSIBILITY_HIGH) {
      suggestion = { unit: alt.unit, canonicalValue: candidate };
      break;
    }
  }

  return {
    plausible: false,
    canonicalValue,
    suggestion,
    reason: `Value is ${ratio < PLAUSIBILITY_LOW ? "far below" : "far above"} the typical range for ${biomarker.canonicalUnit}.`,
  };
}
