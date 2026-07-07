// Generates supabase/migrations/0003_seed_biomarkers.sql from the catalog.
// Run:  node scripts/generate-seed.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CATALOG } from "./biomarker-catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "supabase", "migrations", "0003_seed_biomarkers.sql");

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const pgArray = (arr) => `ARRAY[${arr.map(q).join(", ")}]::text[]`;
const jsonb = (obj) => `${q(JSON.stringify(obj))}::jsonb`;

const rows = CATALOG.map((b) => {
  return `  (${q(b.id)}, ${q(b.name)}, ${pgArray(b.aliases)}, ${q(b.category)}, ${q(
    b.canonicalUnit,
  )}, ${jsonb(b.altUnits)}, ${jsonb(b.defaultRanges)}, false, NULL)`;
});

const header = `-- 0003_seed_biomarkers.sql
-- GENERATED FILE — do not edit by hand.
-- Source: scripts/biomarker-catalog.mjs  (regenerate with: node scripts/generate-seed.mjs)
-- Inserts the ${CATALOG.length} built-in biomarkers. user_id IS NULL => built-in,
-- readable by everyone, writable by no one (see RLS in 0002_rls.sql).

insert into public.biomarkers
  (id, name, aliases, category, canonical_unit, alt_units, default_ranges, is_custom, user_id)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  category = excluded.category,
  canonical_unit = excluded.canonical_unit,
  alt_units = excluded.alt_units,
  default_ranges = excluded.default_ranges;
`;

writeFileSync(out, header);
console.log(`Wrote ${CATALOG.length} biomarkers to ${out}`);
