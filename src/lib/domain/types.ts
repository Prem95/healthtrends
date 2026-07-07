// Canonical domain types — shared shape per product PRD §9.2.
// These are pure data types with no runtime dependencies.

export type Sex = "M" | "F" | "OTHER";

export type BiomarkerCategory =
  | "LIPIDS"
  | "GLUCOSE"
  | "THYROID"
  | "CBC"
  | "LIVER"
  | "KIDNEY"
  | "VITAMINS"
  | "IRON"
  | "HORMONES"
  | "OTHER";

/**
 * A reference range. Either bound may be absent (one-sided).
 * `sex` undefined means it applies to all sexes.
 */
export type RefRange = {
  sex?: "M" | "F";
  min?: number;
  max?: number;
};

export type AltUnit = {
  unit: string;
  /** Multiply an entered value in this unit by `toCanonical` to get the canonical value. */
  toCanonical: number;
};

export type Biomarker = {
  id: string;
  name: string;
  aliases: string[];
  category: BiomarkerCategory;
  canonicalUnit: string;
  altUnits: AltUnit[];
  defaultRanges: RefRange[];
  isCustom: boolean;
};

export type Profile = {
  id: string;
  name: string;
  sex: Sex;
  dateOfBirth?: string; // ISO date (no time component)
};

export type TestSession = {
  id: string;
  profileId: string;
  date: string; // ISO calendar date — collection date
  labName?: string;
  orderedBy?: string;
  fasting?: boolean;
  notes?: string;
  createdAt?: string;
};

export type TestResult = {
  id: string;
  sessionId: string;
  biomarkerId: string;
  value: number; // ALWAYS canonical unit
  enteredUnit: string;
  labRange?: RefRange | null; // overrides catalog when present
  flagOnReport?: "H" | "L" | null;
  note?: string | null;
};

export type LifeEvent = {
  id: string;
  profileId: string;
  date: string;
  label: string;
};

// ---- Derived (computed at read time, never stored) ----

export type ResultStatus =
  | "LOW"
  | "IN_RANGE"
  | "HIGH"
  | "BORDERLINE_LOW"
  | "BORDERLINE_HIGH"
  | "NO_RANGE";

export type TrendDirection =
  | "RISING"
  | "FALLING"
  | "STABLE"
  | "INSUFFICIENT_DATA";
