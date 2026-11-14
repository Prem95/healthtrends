import {
  getActiveProfile,
  getBiomarkers,
  getCustomRanges,
  getResults,
  getSessions,
  getUnitPreferences,
  getWatched,
} from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { OverviewView } from "@/components/views/overview-view";
import { APP_CTX } from "@/lib/view-context";

export default async function DashboardPage() {
  const profile = (await getActiveProfile())!;
  const [biomarkers, results, sessions, watched, unitPrefs, customRanges] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
    getSessions(profile.id),
    getWatched(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);

  return (
    <OverviewView
      ctx={APP_CTX}
      profile={profile}
      summaries={summarize(results, biomarkers, profile.sex, customRanges)}
      sessions={sessions}
      watched={watched}
      unitPrefs={unitPrefs}
    />
  );
}
