import type { Biomarker } from '@domain';
import { describe, expect, it } from '@jest/globals';

import { summarize, type ResultWithSession } from '@/lib/analytics';
import { escapeHtml, formatRange } from '@/lib/format';
import { buildSummary, monthsBefore, summaryHtml } from '@/lib/summary';

const LDL: Biomarker = {
  id: 'ldl-cholesterol',
  name: 'LDL Cholesterol',
  aliases: [],
  category: 'LIPIDS',
  canonicalUnit: 'mg/dL',
  altUnits: [{ unit: 'mmol/L', toCanonical: 38.67 }],
  defaultRanges: [{ max: 100 }],
  isCustom: false,
};
const GLUCOSE: Biomarker = {
  id: 'fasting-glucose',
  name: 'Fasting Glucose',
  aliases: [],
  category: 'GLUCOSE',
  canonicalUnit: 'mg/dL',
  altUnits: [{ unit: 'mmol/L', toCanonical: 18.0182 }],
  defaultRanges: [{ min: 70, max: 99 }],
  isCustom: false,
};
const CUSTOM: Biomarker = {
  id: 'custom-x',
  name: '<b>Odd & "marker"</b>',
  aliases: [],
  category: 'OTHER',
  canonicalUnit: 'U/L',
  altUnits: [],
  defaultRanges: [{ min: 10, max: 20 }],
  isCustom: true,
};

let n = 0;
function result(b: Biomarker, date: string, value: number): ResultWithSession {
  n += 1;
  return { id: `r${n}`, sessionId: `s-${date}`, biomarkerId: b.id, value, enteredUnit: b.canonicalUnit, sessionDate: date };
}

const summaries = summarize(
  [
    result(LDL, '2024-01-10', 120),
    result(LDL, '2026-09-01', 130), // high
    result(GLUCOSE, '2026-09-01', 97), // borderline high
    result(CUSTOM, '2023-05-05', 15), // only outside a 1-year window
  ],
  [LDL, GLUCOSE, CUSTOM],
  'OTHER',
);

describe('monthsBefore', () => {
  it('counts back calendar months and clamps to the month end', () => {
    expect(monthsBefore('2026-11-15', 12)).toBe('2025-11-15');
    expect(monthsBefore('2026-03-31', 1)).toBe('2026-02-28');
    expect(monthsBefore('2026-01-15', 6)).toBe('2025-07-15');
  });
});

describe('buildSummary', () => {
  it('keeps the latest result inside the window and flags out-of-range first', () => {
    const s = buildSummary(summaries, {}, '1y', '2026-11-15');
    expect(s.lines.map((l) => l.id)).toEqual(['fasting-glucose', 'ldl-cholesterol']);
    expect(s.flagged.map((l) => [l.id, l.status])).toEqual([
      ['ldl-cholesterol', 'HIGH'],
      ['fasting-glucose', 'BORDERLINE_HIGH'],
    ]);
    expect(s.latestDate).toBe('2026-09-01');
    expect(s.lines.find((l) => l.id === 'ldl-cholesterol')?.reference).toBe('under 100');
  });

  it('includes everything for "all" and shows values in the preferred unit', () => {
    const s = buildSummary(summaries, { 'fasting-glucose': 'mmol/L' }, 'all', '2026-11-15');
    expect(s.lines).toHaveLength(3);
    const g = s.lines.find((l) => l.id === 'fasting-glucose')!;
    expect(g.unit).toBe('mmol/L');
    expect(g.value).toBe('5.38'); // same precision rule as the website (formatInUnit)
    expect(s.windowText).toBe('all recorded history');
  });

  it('escapes user-entered names in the PDF page', () => {
    const html = summaryHtml('Sam <3', buildSummary(summaries, {}, 'all', '2026-11-15'), '2026-11-15');
    expect(html).not.toContain('<b>Odd');
    expect(html).toContain('&lt;b&gt;Odd &amp; &quot;marker&quot;&lt;/b&gt;');
    expect(html).toContain('Sam &lt;3’s results, on one page');
    expect(html).toContain('does not provide medical advice');
  });
});

describe('format helpers', () => {
  it('formats ranges the way the product writes them', () => {
    const f = (x: number) => String(x);
    expect(formatRange({ min: 70, max: 99 }, f)).toBe('70–99');
    expect(formatRange({ max: 100 }, f)).toBe('under 100');
    expect(formatRange({ min: 40 }, f)).toBe('over 40');
    expect(formatRange(null, f)).toBe('—');
  });

  it('escapes every HTML-significant character', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
