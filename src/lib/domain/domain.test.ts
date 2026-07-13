import { describe, it, expect } from "vitest";
import {
  parseDecimal,
  toCanonical,
  fromCanonical,
  conversionFactor,
  resolveDisplayUnit,
  formatMeasured,
  formatInUnit,
  rangeInUnit,
} from "./units";
import {
  computeStatus,
  statusForRange,
  resolveRange,
  DEFAULT_BORDERLINE_FRACTION,
} from "./status";
import { computeTrend } from "./trend";
import { checkPlausibility } from "./plausibility";
import type { Biomarker } from "./types";

// --- Test fixtures modelled on the real catalog ---
const glucose: Biomarker = {
  id: "fasting-glucose",
  name: "Fasting Glucose",
  aliases: [],
  category: "GLUCOSE",
  canonicalUnit: "mg/dL",
  altUnits: [{ unit: "mmol/L", toCanonical: 18.0182 }],
  defaultRanges: [{ min: 70, max: 99 }],
  isCustom: false,
};

const ldl: Biomarker = {
  id: "ldl-cholesterol",
  name: "LDL Cholesterol",
  aliases: [],
  category: "LIPIDS",
  canonicalUnit: "mg/dL",
  altUnits: [{ unit: "mmol/L", toCanonical: 38.67 }],
  defaultRanges: [{ max: 100 }], // one-sided
  isCustom: false,
};

const hdl: Biomarker = {
  id: "hdl-cholesterol",
  name: "HDL Cholesterol",
  aliases: [],
  category: "LIPIDS",
  canonicalUnit: "mg/dL",
  altUnits: [],
  defaultRanges: [
    { sex: "M", min: 40 },
    { sex: "F", min: 50 },
  ], // sex-specific, one-sided
  isCustom: false,
};

describe("parseDecimal", () => {
  it("accepts dot and comma separators", () => {
    expect(parseDecimal("5.4")).toBeCloseTo(5.4);
    expect(parseDecimal("5,4")).toBeCloseTo(5.4);
    expect(parseDecimal(" 98 ")).toBe(98);
  });
  it("handles grouping + decimal", () => {
    expect(parseDecimal("1.234,5")).toBeCloseTo(1234.5);
    expect(parseDecimal("1,234.5")).toBeCloseTo(1234.5);
  });
  it("rejects non-numbers", () => {
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });
});

describe("unit conversion", () => {
  it("returns factor 1 for canonical unit (case-insensitive)", () => {
    expect(conversionFactor(glucose, "mg/dL")).toBe(1);
    expect(conversionFactor(glucose, "MG/DL")).toBe(1);
  });
  it("converts alternate unit to canonical", () => {
    // 5.4 mmol/L glucose ≈ 97.3 mg/dL
    expect(toCanonical(glucose, 5.4, "mmol/L")).toBeCloseTo(97.3, 0);
  });
  it("round-trips canonical → display → canonical", () => {
    const canon = toCanonical(glucose, 5.4, "mmol/L");
    expect(fromCanonical(glucose, canon, "mmol/L")).toBeCloseTo(5.4, 4);
  });
  it("throws on unknown unit", () => {
    expect(() => toCanonical(glucose, 5, "banana")).toThrow();
  });
});

describe("display unit resolution + formatting", () => {
  it("resolves a valid preferred unit, falls back to canonical otherwise", () => {
    expect(resolveDisplayUnit(glucose, "mmol/L")).toBe("mmol/L");
    expect(resolveDisplayUnit(glucose, "mg/dL")).toBe("mg/dL");
    expect(resolveDisplayUnit(glucose, "banana")).toBe("mg/dL"); // unknown → canonical
    expect(resolveDisplayUnit(glucose, undefined)).toBe("mg/dL");
    expect(resolveDisplayUnit(hdl, "mmol/L")).toBe("mg/dL"); // no such alt → canonical
  });

  it("formats measured values with magnitude-aware precision", () => {
    expect(formatMeasured(99)).toBe("99");
    expect(formatMeasured(5.4)).toBe("5.4");
    expect(formatMeasured(0.87)).toBe("0.87");
  });

  it("converts a canonical value into the display unit before formatting", () => {
    // 97.3 mg/dL glucose ≈ 5.4 mmol/L
    expect(formatInUnit(glucose, 97.3, "mmol/L")).toBe("5.4");
    // canonical unit is a no-op conversion
    expect(formatInUnit(glucose, 99, "mg/dL")).toBe("99");
  });

  it("converts range bounds into the display unit", () => {
    const r = rangeInUnit(glucose, { min: 70, max: 99 }, "mmol/L");
    expect(r?.min).toBeCloseTo(70 / 18.0182, 3);
    expect(r?.max).toBeCloseTo(99 / 18.0182, 3);
    // one-sided range keeps the missing bound undefined
    const one = rangeInUnit(ldl, { max: 100 }, "mmol/L");
    expect(one?.min).toBeUndefined();
    expect(one?.max).toBeCloseTo(100 / 38.67, 3);
    expect(rangeInUnit(glucose, null, "mmol/L")).toBeNull();
  });
});

describe("custom range precedence (labRange > custom > default)", () => {
  it("custom range overrides the catalog default", () => {
    const r = resolveRange(null, { min: 80, max: 120 }, glucose.defaultRanges, "F");
    expect(r.range).toEqual({ min: 80, max: 120 });
  });

  it("a per-result lab range still wins over a custom range", () => {
    const r = resolveRange({ min: 65, max: 95 }, { min: 80, max: 120 }, glucose.defaultRanges, "F");
    expect(r.range).toEqual({ min: 65, max: 95 });
  });

  it("computeStatus flags against the custom range, not the default", () => {
    // 105 is HIGH against the default 70–99, but IN_RANGE with a custom 70–120.
    expect(computeStatus({ value: 105, biomarker: glucose, profileSex: "F" }).status).toBe("HIGH");
    expect(
      computeStatus({
        value: 105,
        customRange: { min: 70, max: 120 },
        biomarker: glucose,
        profileSex: "F",
      }).status,
    ).toBe("IN_RANGE");
  });

  it("an empty custom range falls through to the default", () => {
    const r = resolveRange(null, null, glucose.defaultRanges, "F");
    expect(r.range).toEqual({ min: 70, max: 99 });
  });
});

describe("status — two-sided range", () => {
  const status = (v: number) =>
    computeStatus({ value: v, biomarker: glucose, profileSex: "F" }).status;
  it("flags LOW / HIGH / IN_RANGE", () => {
    expect(status(60)).toBe("LOW");
    expect(status(85)).toBe("IN_RANGE");
    expect(status(120)).toBe("HIGH");
  });
  it("flags borderline within 10% of a boundary", () => {
    // max 99, 10% margin = 9.9 → 90..99 borderline high
    expect(status(95)).toBe("BORDERLINE_HIGH");
    // min 70, 10% margin = 7 → 70..77 borderline low
    expect(status(72)).toBe("BORDERLINE_LOW");
  });
});

describe("status — one-sided range (LDL < 100)", () => {
  const status = (v: number, labRange?: { min?: number; max?: number } | null) =>
    computeStatus({ value: v, biomarker: ldl, profileSex: "M", labRange }).status;
  it("cannot be LOW (no min bound)", () => {
    expect(status(5)).toBe("IN_RANGE"); // very low but no lower bound to flag
  });
  it("is HIGH above the bound, borderline just under it", () => {
    expect(status(130)).toBe("HIGH");
    expect(status(95)).toBe("BORDERLINE_HIGH"); // within 10% of 100
    expect(status(80)).toBe("IN_RANGE");
  });
  it("resolveRange returns single-bound range, min stays undefined", () => {
    const r = resolveRange(null, null, ldl.defaultRanges, "M");
    expect(r.range?.max).toBe(100);
    expect(r.range?.min).toBeUndefined();
  });
});

describe("status — sex-specific ranges (HDL)", () => {
  it("resolves the male bound for M and female bound for F", () => {
    expect(computeStatus({ value: 45, biomarker: hdl, profileSex: "M" }).appliedRange?.min).toBe(40);
    expect(computeStatus({ value: 45, biomarker: hdl, profileSex: "F" }).appliedRange?.min).toBe(50);
    // 45 is IN_RANGE for M (>40) but LOW for F (<50)
    expect(computeStatus({ value: 45, biomarker: hdl, profileSex: "M" }).status).toBe("IN_RANGE");
    expect(computeStatus({ value: 45, biomarker: hdl, profileSex: "F" }).status).toBe("LOW");
  });
  it("sex=OTHER with sex-conditional ranges → NO_RANGE + ambiguous", () => {
    const res = computeStatus({ value: 45, biomarker: hdl, profileSex: "OTHER" });
    expect(res.status).toBe("NO_RANGE");
    expect(res.ambiguousSex).toBe(true);
  });
  it("sex=OTHER but a labRange is present → uses labRange", () => {
    const res = computeStatus({
      value: 45,
      biomarker: hdl,
      profileSex: "OTHER",
      labRange: { min: 40 },
    });
    expect(res.status).toBe("IN_RANGE");
    expect(res.ambiguousSex).toBe(false);
  });
});

describe("status — lab range overrides catalog", () => {
  it("uses the per-result lab range when present", () => {
    // catalog says <100 HIGH at 110; lab range max 130 → 110 is IN_RANGE
    const res = computeStatus({ value: 110, biomarker: ldl, profileSex: "M", labRange: { max: 130 } });
    expect(res.status).toBe("IN_RANGE");
    expect(res.appliedRange?.max).toBe(130);
  });
});

describe("statusForRange — no range", () => {
  it("returns NO_RANGE when both bounds absent", () => {
    expect(statusForRange(5, null)).toBe("NO_RANGE");
    expect(statusForRange(5, {})).toBe("NO_RANGE");
  });
  it("borderline fraction is configurable", () => {
    // With 0 fraction, 95 vs max 99 is IN_RANGE not borderline
    expect(statusForRange(95, { min: 70, max: 99 }, 0)).toBe("IN_RANGE");
    expect(DEFAULT_BORDERLINE_FRACTION).toBe(0.1);
  });
});

describe("trend rule", () => {
  it("INSUFFICIENT_DATA below 2 points", () => {
    expect(computeTrend([]).direction).toBe("INSUFFICIENT_DATA");
    expect(computeTrend([{ date: "2026-01-01", value: 100 }]).direction).toBe("INSUFFICIENT_DATA");
  });
  it("RISING when last 3 monotonic up and ≥10% total change", () => {
    const t = computeTrend([
      { date: "2024-01-01", value: 90 },
      { date: "2025-01-01", value: 100 },
      { date: "2026-01-01", value: 110 },
    ]);
    expect(t.direction).toBe("RISING");
    expect(t.deltaAbs).toBe(10);
    expect(t.deltaPct).toBeCloseTo(10, 5);
  });
  it("FALLING when last 3 monotonic down and ≥10%", () => {
    expect(
      computeTrend([
        { date: "2024-01-01", value: 60 },
        { date: "2025-01-01", value: 50 },
        { date: "2026-01-01", value: 40 },
      ]).direction,
    ).toBe("FALLING");
  });
  it("STABLE when monotonic but < 10% total change", () => {
    expect(
      computeTrend([
        { date: "2024-01-01", value: 100 },
        { date: "2025-01-01", value: 101 },
        { date: "2026-01-01", value: 102 },
      ]).direction,
    ).toBe("STABLE");
  });
  it("STABLE when not monotonic", () => {
    expect(
      computeTrend([
        { date: "2024-01-01", value: 100 },
        { date: "2025-01-01", value: 130 },
        { date: "2026-01-01", value: 110 },
      ]).direction,
    ).toBe("STABLE");
  });
  it("sorts unsorted input by date before evaluating", () => {
    const t = computeTrend([
      { date: "2026-01-01", value: 110 },
      { date: "2024-01-01", value: 90 },
      { date: "2025-01-01", value: 100 },
    ]);
    expect(t.direction).toBe("RISING");
    expect(t.latest).toBe(110);
  });
});

describe("plausibility check", () => {
  it("accepts a plausible value", () => {
    const r = checkPlausibility(glucose, 98, "mg/dL");
    expect(r.plausible).toBe(true);
    expect(r.canonicalValue).toBe(98);
  });
  it("flags an implausible value and suggests the right unit", () => {
    // 3.5 mg/dL glucose is below 0.05× the ~84.5 midpoint (floor ≈ 4.2) →
    // implausible; 3.5 mmol/L ≈ 63 mg/dL is plausible → suggested.
    const r = checkPlausibility(glucose, 3.5, "mg/dL");
    expect(r.plausible).toBe(false);
    expect(r.suggestion?.unit).toBe("mmol/L");
    expect(r.suggestion?.canonicalValue).toBeCloseTo(63.1, 0);
  });
  it("flags implausibly high values", () => {
    const r = checkPlausibility(glucose, 5000, "mg/dL");
    expect(r.plausible).toBe(false);
  });
  it("accepts when no range exists to anchor against", () => {
    const noRange: Biomarker = { ...glucose, defaultRanges: [] };
    expect(checkPlausibility(noRange, 0.001, "mg/dL").plausible).toBe(true);
  });
});
