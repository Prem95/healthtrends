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
    <div className="animate-rise">
      <h1 className="font-display text-3xl text-ink">New test session</h1>
      <p className="mt-1 text-sm text-ink-2">
        For {profile.name}. Only the date is required — add whichever markers your report
        includes.
      </p>

      {overLimit ? (
        <div className="mt-6 max-w-lg rounded-lg border border-borderline/25 bg-borderline-soft p-5">
          <p className="font-medium text-ink">Free plan limit reached</p>
          <p className="mt-1 text-sm text-ink-2">
            The Free plan includes 20 test sessions in total. Your existing data stays exactly
            as it is — upgrade to Pro in Settings to keep adding new sessions.
          </p>
        </div>
      ) : (
        <div className="mt-6">
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
