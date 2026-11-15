import { describe, expect, it } from "vitest";
import { BUILTIN_BIOMARKERS, BUILTIN_COUNT } from "./catalog";
import { getDemoData } from "./demo";
import { attentionRank, needsAttention, toDigest } from "./digest";
import { prettyUnit } from "./utils";
import { formatDelta, statusTone } from "./domain";

// The landing page and /demo quote these numbers, so they are pinned here:
// if the sample data or a domain rule changes, the copy has to be re-checked.
describe("sample profile", () => {
  const demo = getDemoData();
  const digests = demo.summaries.filter((s) => s.latest).map((s) => toDigest(s, {}));

  it("uses only catalog markers and newest-first sessions", () => {
    const ids = new Set(BUILTIN_BIOMARKERS.map((b) => b.id));
    expect(demo.results.every((r) => ids.has(r.biomarkerId))).toBe(true);
    const dates = demo.sessions.map((s) => s.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(BUILTIN_COUNT).toBe(71);
  });

  it("reads 17 of 22 in range, 3 borderline, 2 out", () => {
    expect(digests).toHaveLength(22);
    expect(digests.filter((d) => d.status === "IN_RANGE")).toHaveLength(17);
    expect(digests.filter((d) => statusTone(d.status) === "borderline").map((d) => d.id).sort()).toEqual(
      ["alt", "hba1c", "ldl-cholesterol"],
    );
    expect(digests.filter((d) => statusTone(d.status) === "out").map((d) => d.id).sort()).toEqual([
      "fasting-glucose",
      "vitamin-d",
    ]);
  });

  it("ranks out-of-range ahead of borderline, furthest out first", () => {
    const ranked = digests
      .filter((d) => needsAttention(d.status))
      .sort((a, b) => attentionRank(b) - attentionRank(a))
      .map((d) => d.id);
    expect(ranked.slice(0, 2)).toEqual(["vitamin-d", "fasting-glucose"]);
    expect(ranked).toHaveLength(5);
  });

  it("builds digests with a signed change since the previous result", () => {
    const ldl = digests.find((d) => d.id === "ldl-cholesterol")!;
    expect(ldl.valueLabel).toBe("94");
    expect(ldl.deltaLabel).toBe("↓ 1");
    expect(ldl.rangeMax).toBe(100);
    const a1c = digests.find((d) => d.id === "hba1c")!;
    expect(a1c.deltaLabel).toBeNull(); // unchanged since the previous test
  });
});

describe("display helpers", () => {
  it("typesets exponents in units", () => {
    expect(prettyUnit("10^3/µL")).toBe("10³/µL");
    expect(prettyUnit("mg/dL")).toBe("mg/dL");
  });
  it("formats a change at the precision of its reading", () => {
    expect(formatDelta(0.1665, 5.77)).toBe("0.17");
    expect(formatDelta(-17, 27)).toBe("17");
  });
});
