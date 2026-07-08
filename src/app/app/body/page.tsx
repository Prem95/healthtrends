import Link from "next/link";
import { getActiveProfile, getBiomarkers, getResults } from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { worstStatus, type RegionData } from "@/lib/body-map";
import { BodyMapView } from "@/components/body/body-map-view";
import { Button } from "@/components/ui/button";
import type { BiomarkerCategory } from "@/lib/domain";

export default async function BodyMapPage() {
  const profile = (await getActiveProfile())!;
  const [biomarkers, results] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
  ]);
  const summaries = summarize(results, biomarkers, profile.sex);

  // Group latest statuses by category; only categories with data get a mark.
  const grouped = new Map<BiomarkerCategory, RegionData>();
  for (const s of summaries) {
    if (!s.latest) continue;
    const category = s.biomarker.category;
    if (!grouped.has(category)) {
      grouped.set(category, { category, worst: "NO_RANGE", markers: [] });
    }
    grouped.get(category)!.markers.push({
      id: s.biomarker.id,
      name: s.biomarker.name,
      value: s.latest.value,
      unit: s.biomarker.canonicalUnit,
      status: s.latestStatus,
    });
  }
  for (const region of grouped.values()) {
    region.worst = worstStatus(region.markers.map((m) => m.status));
    region.markers.sort((a, b) => a.name.localeCompare(b.name));
  }
  const regions = [...grouped.values()];

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="au-hl text-3xl text-ink">Body map</h1>
        <p className="mt-1 text-sm text-ink-2">
          The latest result for every tracked marker, placed on the body system
          it describes.
        </p>
      </header>

      {regions.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="text-ink-2">
            No results for {profile.name} yet, so there is nothing to place on
            the figure.
          </p>
          <Button asChild variant="subtle" size="sm" className="mt-3">
            <Link href="/app/sessions/new">Add a test session</Link>
          </Button>
        </div>
      ) : (
        <BodyMapView regions={regions} />
      )}
    </div>
  );
}
