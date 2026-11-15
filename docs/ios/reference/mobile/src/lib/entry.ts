import {
  checkPlausibility,
  conversionFactor,
  formatMeasured,
  parseDecimal,
  type Biomarker,
  type RefRange,
} from '@domain';

import type { NewResult } from '@/lib/api';
import { prettyUnit } from '@/lib/format';

/*
  The checks Add results runs before saving, as pure functions so they can be
  tested without a device. Same rules as the web's createSession action:
  convert to the canonical unit, flag implausible values (almost always a
  slipped decimal or the wrong unit), warn about duplicates. Nothing here
  blocks a value the person has confirmed.
*/

/** One row of the form, exactly as typed. */
export type EntryRow = {
  key: string;
  biomarkerId: string;
  value: string;
  unit: string;
  refMin: string;
  refMax: string;
  /** The person said "the value is correct" to a plausibility warning. */
  confirmed: boolean;
};

export type RowError = 'not_a_number' | 'range_not_a_number' | 'range_order' | 'unknown_unit';

export const ROW_ERROR_TEXT: Record<RowError, string> = {
  not_a_number: 'Not a number yet.',
  range_not_a_number: 'The range needs numbers, or leave it blank.',
  range_order: 'The lowest value is above the highest.',
  unknown_unit: 'Choose a unit for this marker.',
};

export type Implausible = {
  key: string;
  biomarkerId: string;
  /** "LDL Cholesterol: 2.4 mg/dL looks unusual." */
  message: string;
  /** The unit that would make the value plausible, if one exists. */
  suggestedUnit: string | null;
  /** "2.4 mmol/L (= 93 mg/dL)" */
  suggestionLabel: string | null;
};

export type Prepared = {
  /** Rows with a value, converted, ready for api.createSession. */
  results: NewResult[];
  /** Row key → what is wrong with it. Saving is blocked while any exist. */
  errors: Record<string, RowError>;
  /** Rows to confirm before saving (never blocking once confirmed). */
  implausible: Implausible[];
};

export function newRow(biomarker: Pick<Biomarker, 'id' | 'canonicalUnit'>, preferredUnit?: string | null): EntryRow {
  return {
    key: `${biomarker.id}-${Math.random().toString(36).slice(2, 8)}`,
    biomarkerId: biomarker.id,
    value: '',
    unit: preferredUnit ?? biomarker.canonicalUnit,
    refMin: '',
    refMax: '',
    confirmed: false,
  };
}

function parseOptional(text: string): number | null | 'invalid' {
  if (text.trim() === '') return null;
  const n = parseDecimal(text);
  return n == null ? 'invalid' : n;
}

/** Validate and convert every row. Empty rows are skipped, not errors. */
export function prepareRows(rows: EntryRow[], byId: Map<string, Biomarker>): Prepared {
  const results: NewResult[] = [];
  const errors: Record<string, RowError> = {};
  const implausible: Implausible[] = [];

  for (const row of rows) {
    if (row.value.trim() === '') continue;
    const biomarker = byId.get(row.biomarkerId);
    if (!biomarker) continue;

    const value = parseDecimal(row.value);
    if (value == null) {
      errors[row.key] = 'not_a_number';
      continue;
    }
    const factor = conversionFactor(biomarker, row.unit);
    if (factor == null) {
      errors[row.key] = 'unknown_unit';
      continue;
    }
    const min = parseOptional(row.refMin);
    const max = parseOptional(row.refMax);
    if (min === 'invalid' || max === 'invalid') {
      errors[row.key] = 'range_not_a_number';
      continue;
    }
    if (min != null && max != null && min > max) {
      errors[row.key] = 'range_order';
      continue;
    }

    let labRange: RefRange | null = null;
    if (min != null || max != null) {
      labRange = {};
      if (min != null) labRange.min = min * factor;
      if (max != null) labRange.max = max * factor;
    }

    if (!row.confirmed) {
      const check = checkPlausibility(biomarker, value, row.unit, labRange);
      if (!check.plausible) {
        const suggestion = check.suggestion ?? null;
        implausible.push({
          key: row.key,
          biomarkerId: biomarker.id,
          message: `${biomarker.name}: ${row.value.trim()} ${prettyUnit(row.unit)} looks unusual.`,
          suggestedUnit: suggestion?.unit ?? null,
          suggestionLabel: suggestion
            ? `${row.value.trim()} ${prettyUnit(suggestion.unit)} (= ${formatMeasured(suggestion.canonicalValue)} ${prettyUnit(biomarker.canonicalUnit)})`
            : null,
        });
      }
    }

    results.push({ biomarkerId: biomarker.id, value: value * factor, enteredUnit: row.unit, labRange });
  }

  return { results, errors, implausible };
}

/**
 * Markers in `results` that already have a result on `date` for this profile.
 * `existing` is every (biomarkerId, date) the profile already has.
 */
export function findDuplicates(
  results: Pick<NewResult, 'biomarkerId'>[],
  date: string,
  existing: { biomarkerId: string; date: string }[],
): string[] {
  const taken = new Set(existing.filter((e) => e.date === date).map((e) => e.biomarkerId));
  return [...new Set(results.map((r) => r.biomarkerId).filter((id) => taken.has(id)))];
}

/** Rows to add for a panel: its markers that are not already in the form. */
export function panelRowsToAdd(panelIds: string[], rows: EntryRow[], byId: Map<string, Biomarker>): string[] {
  const present = new Set(rows.map((r) => r.biomarkerId));
  return panelIds.filter((id) => byId.has(id) && !present.has(id));
}
