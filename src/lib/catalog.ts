import { CATALOG } from "../../scripts/biomarker-catalog.mjs";
import type { Biomarker, BiomarkerCategory, RefRange, AltUnit } from "@/lib/domain";

/*
  The built-in biomarker catalog as typed domain objects. Same source of truth
  as the seed migration (scripts/biomarker-catalog.mjs), so the marketing page
  and the sample dashboard always describe exactly what the product ships.
*/

type RawEntry = {
  id: string;
  name: string;
  category: string;
  canonicalUnit: string;
  aliases: string[];
  altUnits: AltUnit[];
  defaultRanges: RefRange[];
};

export const BUILTIN_BIOMARKERS: (Biomarker & { archived: boolean })[] = (
  CATALOG as unknown as RawEntry[]
).map((b) => ({
  id: b.id,
  name: b.name,
  aliases: b.aliases,
  category: b.category as BiomarkerCategory,
  canonicalUnit: b.canonicalUnit,
  altUnits: b.altUnits,
  defaultRanges: b.defaultRanges,
  isCustom: false,
  archived: false,
}));

export const BUILTIN_COUNT = BUILTIN_BIOMARKERS.length;
