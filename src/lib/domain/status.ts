import type {
  Biomarker,
  RefRange,
  ResultStatus,
  Sex,
} from "./types";

export const DEFAULT_BORDERLINE_FRACTION = 0.1;

function hasBound(r: RefRange | null | undefined): boolean {
  return !!r && (r.min != null || r.max != null);
}

export type ResolvedRange = {
  /** The range to use for status/flagging, in canonical units. Null = none. */
  range: RefRange | null;
  /**
   * True when the profile sex is OTHER and the only applicable ranges are
   * sex-conditional (so we cannot pick one). UI shows both bands faintly and
   * status is NO_RANGE unless a lab range was entered.
   */
  ambiguousSex: boolean;
  /** Both sex bands, for faint rendering when ambiguousSex is true. */
  sexBands?: RefRange[];
};

/**
 * Resolve which range applies to a result, in priority order:
 *   1. labRange — the range printed on that specific report — always wins.
 *   2. customRange — the profile's own override for this marker.
 *   3. catalog defaults, picked by the profile's sex.
 *
 * All ranges are assumed to be in the biomarker's canonical unit.
 */
export function resolveRange(
  labRange: RefRange | null | undefined,
  customRange: RefRange | null | undefined,
  defaultRanges: RefRange[],
  profileSex: Sex,
): ResolvedRange {
  if (hasBound(labRange)) {
    return { range: labRange as RefRange, ambiguousSex: false };
  }
  if (hasBound(customRange)) {
    return { range: customRange as RefRange, ambiguousSex: false };
  }

  const bounded = (defaultRanges ?? []).filter(hasBound);
  const universal = bounded.filter((r) => r.sex == null);
  const sexConditional = bounded.filter((r) => r.sex != null);

  if (profileSex === "M" || profileSex === "F") {
    const match = sexConditional.find((r) => r.sex === profileSex);
    if (match) return { range: match, ambiguousSex: false };
    if (universal.length) return { range: universal[0], ambiguousSex: false };
    return { range: null, ambiguousSex: false };
  }

  // profileSex === OTHER
  if (universal.length) return { range: universal[0], ambiguousSex: false };
  if (sexConditional.length) {
    return { range: null, ambiguousSex: true, sexBands: sexConditional };
  }
  return { range: null, ambiguousSex: false };
}

/**
 * Compute a status for a canonical value against a canonical range.
 * Borderline = within `fraction` of a boundary (relative to the boundary
 * magnitude), on the in-range side of that boundary.
 */
export function statusForRange(
  value: number,
  range: RefRange | null,
  fraction: number = DEFAULT_BORDERLINE_FRACTION,
): ResultStatus {
  if (!hasBound(range)) return "NO_RANGE";
  const { min, max } = range as RefRange;

  if (max != null && value > max) return "HIGH";
  if (min != null && value < min) return "LOW";

  if (max != null) {
    const margin = Math.abs(max) * fraction;
    if (value >= max - margin) return "BORDERLINE_HIGH";
  }
  if (min != null) {
    const margin = Math.abs(min) * fraction;
    if (value <= min + margin) return "BORDERLINE_LOW";
  }
  return "IN_RANGE";
}

/**
 * Full status computation for a single result. Handles lab-range override,
 * sex resolution, one-sided ranges, and the OTHER-sex ambiguity rule.
 */
export function computeStatus(args: {
  value: number; // canonical
  labRange?: RefRange | null; // canonical
  customRange?: RefRange | null; // canonical, profile override
  biomarker: Pick<Biomarker, "defaultRanges">;
  profileSex: Sex;
  fraction?: number;
}): { status: ResultStatus; appliedRange: RefRange | null; ambiguousSex: boolean } {
  const { value, labRange, customRange, biomarker, profileSex } = args;
  const fraction = args.fraction ?? DEFAULT_BORDERLINE_FRACTION;
  const resolved = resolveRange(labRange, customRange, biomarker.defaultRanges, profileSex);

  if (resolved.ambiguousSex) {
    return { status: "NO_RANGE", appliedRange: null, ambiguousSex: true };
  }
  return {
    status: statusForRange(value, resolved.range, fraction),
    appliedRange: resolved.range,
    ambiguousSex: false,
  };
}

export const STATUS_LABEL: Record<ResultStatus, string> = {
  LOW: "Below range",
  IN_RANGE: "In range",
  HIGH: "Above range",
  BORDERLINE_LOW: "Near low boundary",
  BORDERLINE_HIGH: "Near high boundary",
  NO_RANGE: "No reference range",
};

export function statusTone(
  status: ResultStatus,
): "in-range" | "borderline" | "out" | "neutral" {
  switch (status) {
    case "IN_RANGE":
      return "in-range";
    case "BORDERLINE_LOW":
    case "BORDERLINE_HIGH":
      return "borderline";
    case "LOW":
    case "HIGH":
      return "out";
    default:
      return "neutral";
  }
}
