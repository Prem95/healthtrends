import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { getUser, listProfiles, getActiveProfile } from "@/lib/data";
import { getPlan } from "@/lib/entitlements";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/app/sidebar-nav";
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
      data-theme="light"
      className="aurora flex min-h-[100dvh] flex-col bg-page text-ink"
    >
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/app">
              <Logo />
            </Link>
            {plan.plan === "pro" ? (
              <Badge tone="brand" className="hidden sm:inline-flex">Pro</Badge>
            ) : (
              <Badge className="hidden sm:inline-flex">Free</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ProfileSwitcher profiles={profiles} activeId={active.id} />
            <Button asChild size="sm" variant="primary">
              <Link href="/app/sessions/new">
                <Plus /> <span className="hidden sm:inline">New test</span>
              </Link>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
                <LogOut />
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
            <Link href="/app/settings" className="font-medium text-brand-strong underline underline-offset-2">
              Update your card in Settings
            </Link>
            .
          </p>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-10 md:py-8">
        <aside className="md:w-44 md:shrink-0">
          <SidebarNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <Disclaimer />
    </div>
  );
}
