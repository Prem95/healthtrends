import { getActiveProfile, getBiomarkers, getResults } from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { BiomarkerBrowser } from "@/components/biomarkers/biomarker-browser";

export default async function AllBiomarkersPage() {
  const profile = (await getActiveProfile())!;
  const [biomarkers, results] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
  ]);
  const summaries = summarize(results, biomarkers, profile.sex);
  const latestById = Object.fromEntries(
    summaries.map((s) => [
      s.biomarker.id,
      {
        value: s.latest?.value ?? null,
        date: s.latest?.date ?? null,
        status: s.latestStatus,
        count: s.points.length,
        spark: s.points.slice(-8).map((p) => p.value),
      },
    ]),
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
            canonicalUnit: b.canonicalUnit,
            isCustom: b.isCustom,
            archived: b.archived,
          }))}
          latestById={latestById}
        />
      </div>
    </div>
  );
}
