import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <div>
      <h1 className="display text-[1.75rem] text-ink sm:text-[2rem]">Add results</h1>
      <p className="mt-1.5 max-w-xl text-sm text-ink-3">
        For {profile.name}. Only the date is required; add whichever markers your report
        includes and leave the rest out.
      </p>

      {overLimit ? (
        <div className="card mt-7 max-w-lg border-borderline/40 bg-borderline-soft p-5">
          <p className="font-medium text-ink">Free plan limit reached</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
            The Free plan includes 20 tests in total. Your existing data stays exactly as it
            is. Upgrade to Pro in Settings to keep adding new ones.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-4">
            <Link href="/app/settings">Open Settings</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-7">
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
