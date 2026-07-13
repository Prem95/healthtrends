import {
  getActiveProfile,
  getBiomarkers,
  getCustomRanges,
  getResults,
  getUnitPreferences,
} from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { formatInUnit, resolveDisplayUnit } from "@/lib/domain";
import { BiomarkerBrowser } from "@/components/biomarkers/biomarker-browser";

export default async function AllBiomarkersPage() {
  const profile = (await getActiveProfile())!;
  const [biomarkers, results, unitPrefs, customRanges] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);
  const summaries = summarize(results, biomarkers, profile.sex, customRanges);
  const latestById = Object.fromEntries(
    summaries.map((s) => {
      const displayUnit = resolveDisplayUnit(s.biomarker, unitPrefs[s.biomarker.id]);
      return [
        s.biomarker.id,
        {
          hasValue: !!s.latest,
          valueLabel: s.latest ? formatInUnit(s.biomarker, s.latest.value, displayUnit) : null,
          unit: displayUnit,
          date: s.latest?.date ?? null,
          status: s.latestStatus,
          count: s.points.length,
          spark: s.points.slice(-8).map((p) => p.value),
        },
      ];
    }),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="au-mono text-[13px] text-ink">Browse</h1>
      <p className="au-mono mt-2 text-[11px] text-ink-3">
        The built-in catalog plus your custom markers · anything with history links to its
        trend
      </p>
      <div className="mt-8">
        <BiomarkerBrowser
          biomarkers={biomarkers.map((b) => ({
            id: b.id,
            name: b.name,
            aliases: b.aliases,
            category: b.category,
            isCustom: b.isCustom,
            archived: b.archived,
          }))}
          latestById={latestById}
        />
      </div>
    </div>
  );
}
