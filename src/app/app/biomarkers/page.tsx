import {
  getActiveProfile,
  getBiomarkers,
  getCustomRanges,
  getResults,
  getUnitPreferences,
} from "@/lib/data";
import { summarize } from "@/lib/analytics";
import { MarkersView } from "@/components/views/markers-view";
import { APP_CTX } from "@/lib/view-context";

export default async function AllBiomarkersPage() {
  const profile = (await getActiveProfile())!;
  const [biomarkers, results, unitPrefs, customRanges] = await Promise.all([
    getBiomarkers(),
    getResults(profile.id),
    getUnitPreferences(),
    getCustomRanges(profile.id),
  ]);

  return (
    <MarkersView
      ctx={APP_CTX}
      biomarkers={biomarkers}
      summaries={summarize(results, biomarkers, profile.sex, customRanges)}
      unitPrefs={unitPrefs}
    />
  );
}
