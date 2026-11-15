import type { Biomarker } from '@domain';
import { describe, expect, it } from '@jest/globals';

import { findDuplicates, newRow, panelRowsToAdd, prepareRows, type EntryRow } from '@/lib/entry';

const LDL: Biomarker = {
  id: 'ldl-cholesterol',
  name: 'LDL Cholesterol',
  aliases: ['ldl'],
  category: 'LIPIDS',
  canonicalUnit: 'mg/dL',
  altUnits: [{ unit: 'mmol/L', toCanonical: 38.67 }],
  defaultRanges: [{ max: 100 }],
  isCustom: false,
};
const GLUCOSE: Biomarker = {
  id: 'fasting-glucose',
  name: 'Fasting Glucose',
  aliases: ['glucose'],
  category: 'GLUCOSE',
  canonicalUnit: 'mg/dL',
  altUnits: [{ unit: 'mmol/L', toCanonical: 18.0182 }],
  defaultRanges: [{ min: 70, max: 99 }],
  isCustom: false,
};
const byId = new Map([LDL, GLUCOSE].map((b) => [b.id, b]));

function row(b: Biomarker, patch: Partial<EntryRow>): EntryRow {
  return { ...newRow(b), ...patch };
}

describe('prepareRows', () => {
  it('skips empty rows and keeps canonical values', () => {
    const p = prepareRows([row(LDL, { value: '94' }), row(GLUCOSE, { value: '  ' })], byId);
    expect(p.errors).toEqual({});
    expect(p.implausible).toEqual([]);
    expect(p.results).toEqual([{ biomarkerId: 'ldl-cholesterol', value: 94, enteredUnit: 'mg/dL', labRange: null }]);
  });

  it('converts an alternate unit and accepts a decimal comma', () => {
    const p = prepareRows([row(GLUCOSE, { value: '5,1', unit: 'mmol/L' })], byId);
    expect(p.results[0].value).toBeCloseTo(91.89, 2);
    expect(p.results[0].enteredUnit).toBe('mmol/L');
  });

  it('converts the range printed on the report', () => {
    const p = prepareRows([row(GLUCOSE, { value: '5.1', unit: 'mmol/L', refMin: '3.9', refMax: '5.5' })], byId);
    expect(p.results[0].labRange?.min).toBeCloseTo(70.27, 2);
    expect(p.results[0].labRange?.max).toBeCloseTo(99.1, 1);
  });

  it('reports rows that are not numbers and does not save them', () => {
    const r = row(LDL, { value: '9 4x' });
    const p = prepareRows([r], byId);
    expect(p.errors[r.key]).toBe('not_a_number');
    expect(p.results).toEqual([]);
  });

  it('reports a reversed or non-numeric report range', () => {
    const a = row(LDL, { value: '94', refMin: '120', refMax: '10' });
    const b = row(GLUCOSE, { value: '90', refMin: 'abc' });
    const p = prepareRows([a, b], byId);
    expect(p.errors[a.key]).toBe('range_order');
    expect(p.errors[b.key]).toBe('range_not_a_number');
  });

  it('questions a value typed in the wrong unit and offers the right one', () => {
    const r = row(LDL, { value: '2.4' });
    const p = prepareRows([r], byId);
    expect(p.implausible).toHaveLength(1);
    expect(p.implausible[0].suggestedUnit).toBe('mmol/L');
    expect(p.implausible[0].message).toBe('LDL Cholesterol: 2.4 mg/dL looks unusual.');
    expect(p.implausible[0].suggestionLabel).toBe('2.4 mmol/L (= 92.8 mg/dL)');
    // still included: the warning never blocks
    expect(p.results).toHaveLength(1);
  });

  it('does not question a value the person confirmed', () => {
    const p = prepareRows([row(LDL, { value: '2.4', confirmed: true })], byId);
    expect(p.implausible).toEqual([]);
  });

  it('accepts the same value once its unit is switched', () => {
    const p = prepareRows([row(LDL, { value: '2.4', unit: 'mmol/L' })], byId);
    expect(p.implausible).toEqual([]);
    expect(p.results[0].value).toBeCloseTo(92.8, 1);
  });
});

describe('findDuplicates', () => {
  it('finds markers already recorded on the same date only', () => {
    const existing = [
      { biomarkerId: 'ldl-cholesterol', date: '2026-03-01' },
      { biomarkerId: 'fasting-glucose', date: '2025-03-01' },
    ];
    const results = [{ biomarkerId: 'ldl-cholesterol' }, { biomarkerId: 'fasting-glucose' }];
    expect(findDuplicates(results, '2026-03-01', existing)).toEqual(['ldl-cholesterol']);
    expect(findDuplicates(results, '2026-04-01', existing)).toEqual([]);
  });
});

describe('panelRowsToAdd', () => {
  it('adds only known markers that are not already in the form', () => {
    const rows = [newRow(LDL)];
    expect(panelRowsToAdd(['ldl-cholesterol', 'fasting-glucose', 'not-in-catalog'], rows, byId)).toEqual([
      'fasting-glucose',
    ]);
  });
});
