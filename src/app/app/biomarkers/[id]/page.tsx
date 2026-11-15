import { notFound } from "next/navigation";
import {
  getActiveProfile,
  getBiomarker,
  getCustomRanges,
  getLifeEvents,
  getResults,
  getUnitPreferences,
  getWatched,
} from "@/lib/data";
import { summarize, type BiomarkerSummary } from "@/lib/analytics";
import { MarkerDetailView } from "@/components/views/marker-detail-view";
import { APP_CTX } from "@/lib/view-context";

export default async function BiomarkerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = (await getActiveProfile())!;
  const [biomarker, results, events, watched, unitPrefs, customRanges] = await Promise.all([
    getBiomarker(id),
    getResults(profile.id),
    getLifeEvents(profile.id),
    getWatched(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);
  if (!biomarker) notFound();

  const summary: BiomarkerSummary =
    summarize(
      results.filter((r) => r.biomarkerId === id),
      [biomarker],
      profile.sex,
      customRanges,
    )[0] ?? emptySummary(biomarker);

  return (
    <MarkerDetailView
      ctx={APP_CTX}
      profile={profile}
      biomarker={biomarker}
      summary={summary}
      events={events}
      isWatched={watched.includes(id)}
      unitPref={unitPrefs[biomarker.id]}
      customRange={customRanges[biomarker.id] ?? null}
      error={error}
    />
  );
}

function emptySummary(biomarker: BiomarkerSummary["biomarker"]): BiomarkerSummary {
  return {
    biomarker,
    points: [],
    latest: null,
    latestStatus: "NO_RANGE",
    trend: {
      direction: "INSUFFICIENT_DATA",
      latest: null,
      previous: null,
      deltaAbs: null,
      deltaPct: null,
      count: 0,
    },
    bandRange: null,
    ambiguousSex: false,
    sexBands: undefined,
  };
}
