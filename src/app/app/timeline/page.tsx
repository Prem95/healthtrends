import {
  getActiveProfile,
  getBiomarkers,
  getCustomRanges,
  getLifeEvents,
  getResults,
  getSessions,
  getUnitPreferences,
} from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { TimelineView } from "@/components/views/timeline-view";
import { APP_CTX } from "@/lib/view-context";

export default async function TimelinePage() {
  const profile = (await getActiveProfile())!;
  const [sessions, results, biomarkers, events, unitPrefs, customRanges] = await Promise.all([
    getSessions(profile.id),
    getResults(profile.id),
    getBiomarkers(),
    getLifeEvents(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);

  return (
    <TimelineView
      ctx={APP_CTX}
      profile={profile}
      sessions={sessions}
      summaries={summarize(results, biomarkers, profile.sex, customRanges)}
      events={events}
      unitPrefs={unitPrefs}
    />
  );
}
