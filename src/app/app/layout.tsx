import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, listProfiles, getActiveProfile } from "@/lib/data";
import { getPlan } from "@/lib/entitlements";
import { AppShell } from "@/components/app/app-shell";
import { APP_CTX } from "@/lib/view-context";
import { formatDate } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/app");

  const profiles = await listProfiles();
  if (profiles.length === 0) redirect("/onboarding");
  const active = (await getActiveProfile())!;
  const plan = await getPlan(user.id);

  return (
    <AppShell
      ctx={APP_CTX}
      profiles={profiles}
      activeId={active.id}
      plan={plan.plan}
      notice={
        plan.pastDue ? (
          <div className="border-b border-line bg-borderline-soft">
            <p className="mx-auto max-w-5xl px-5 py-2.5 text-sm text-ink sm:px-8">
              Your last payment did not go through. Pro access continues until{" "}
              {plan.currentPeriodEnd ? formatDate(plan.currentPeriodEnd) : "the period ends"}.{" "}
              <Link
                href="/app/settings"
                className="font-medium text-brand underline underline-offset-4 hover:text-brand-strong"
              >
                Update your card in Settings
              </Link>
              .
            </p>
          </div>
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
