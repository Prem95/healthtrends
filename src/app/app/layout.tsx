import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, listProfiles, getActiveProfile } from "@/lib/data";
import { getPlan } from "@/lib/entitlements";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { AppNav, TabBar } from "@/components/app/sidebar-nav";
import { ProfileSwitcher } from "@/components/app/profile-switcher";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/app");

  const profiles = await listProfiles();
  if (profiles.length === 0) redirect("/onboarding");
  const active = (await getActiveProfile())!;
  const plan = await getPlan(user.id);

  return (
    <div
      data-theme="dark"
      className="aurora flex min-h-[100dvh] flex-col bg-page text-ink"
    >
      {/* Nav bar: frosted over the scrolling canvas, hairline below */}
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/app" aria-label="Markers overview">
              <Logo />
            </Link>
            <Badge tone={plan.plan === "pro" ? "brand" : "neutral"} className="hidden sm:inline-flex">
              {plan.plan === "pro" ? "Pro" : "Free"}
            </Badge>
          </div>

          <div className="ml-auto flex items-center gap-5">
            <AppNav />
            <ProfileSwitcher profiles={profiles} activeId={active.id} />
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link href="/app/sessions/new">＋ New test</Link>
            </Button>
            <form action={signOut} className="hidden md:block">
              <Button type="submit" variant="ghost" size="sm" title="Sign out">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {plan.pastDue && (
        <div className="border-b border-borderline/25 bg-borderline-soft">
          <p className="mx-auto max-w-6xl px-6 py-2 text-sm text-ink">
            Your last payment did not go through. Pro access continues until{" "}
            {plan.currentPeriodEnd ? formatDate(plan.currentPeriodEnd) : "the period ends"}.{" "}
            <Link href="/app/settings" className="text-brand underline underline-offset-2 hover:text-brand-strong">
              Update your card in Settings
            </Link>
            .
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-28 sm:px-6 md:pb-12">
        {children}
      </main>

      <div className="pb-16 md:pb-0">
        <Disclaimer />
      </div>
      <TabBar />
    </div>
  );
}
