import { notFound } from "next/navigation";
import { MarkerDetailView } from "@/components/views/marker-detail-view";
import { summarize } from "@/lib/analytics";
import { getDemoData, getDemoSummary } from "@/lib/demo";
import { DEMO_CTX } from "@/lib/view-context";

export default async function DemoMarkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unit?: string }>;
}) {
  const { id } = await params;
  const { unit } = await searchParams;
  const demo = getDemoData();
  const biomarker = demo.biomarkers.find((b) => b.id === id);
  if (!biomarker) notFound();

  // A catalog marker the sample profile has no results for still opens, empty.
  const summary =
    getDemoSummary(id) ??
    summarize([], [biomarker], demo.profile.sex)[0] ?? {
      biomarker,
      points: [],
      latest: null,
      latestStatus: "NO_RANGE" as const,
      trend: {
        direction: "INSUFFICIENT_DATA" as const,
        latest: null,
        previous: null,
        deltaAbs: null,
        deltaPct: null,
        count: 0,
      },
      bandRange: null,
      ambiguousSex: false,
    };

  return (
    <MarkerDetailView
      ctx={DEMO_CTX}
      profile={demo.profile}
      biomarker={biomarker}
      summary={summary}
      events={demo.events}
      isWatched={demo.watched.includes(id)}
      unitPref={unit}
      customRange={null}
    />
  );
}
