import { redirect } from "next/navigation";
import { getActiveProfile, getBiomarkers, getUser, countAllSessions } from "@/lib/data";
import { getPlan } from "@/lib/entitlements";
import { NewSessionForm } from "@/components/sessions/new-session-form";
import { todayISO } from "@/lib/utils";

export default async function NewSessionPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/app/sessions/new");
  const profile = (await getActiveProfile())!;
  const [biomarkers, plan, sessionCount] = await Promise.all([
    getBiomarkers(),
    getPlan(user.id),
    countAllSessions(),
  ]);

  const overLimit =
    Number.isFinite(plan.limits.maxSessions) && sessionCount >= plan.limits.maxSessions;

  return (
    <div className="max-w-3xl">
      <h1 className="au-mono text-[13px] text-ink">Log a test</h1>
      <p className="au-mono mt-2 text-[11px] text-ink-3">
        {profile.name} · only the date is required · add whichever markers your report
        includes
      </p>

      {overLimit ? (
        <div className="au-card mt-8 max-w-lg border-borderline/25 bg-borderline-soft p-5">
          <p className="font-medium text-ink">Free plan limit reached</p>
          <p className="mt-1 text-sm text-ink-2">
            The Free plan includes 20 test sessions in total. Your existing data stays exactly
            as it is. Upgrade to Pro in Settings to keep adding new sessions.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <NewSessionForm
            profileId={profile.id}
            profileSex={profile.sex}
            biomarkers={biomarkers.filter((b) => !b.archived)}
            today={todayISO()}
          />
        </div>
      )}
    </div>
  );
}
