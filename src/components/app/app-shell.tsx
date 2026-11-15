import Link from "next/link";
import { ArrowRight, LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/domain";
import type { ViewCtx } from "@/lib/view-context";
import { Logo } from "@/components/brand/logo";
import { SideNav, TabBar } from "@/components/app/sidebar-nav";
import { ProfileSwitcher } from "@/components/app/profile-switcher";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/status-badge";

/*
  The frame around every product screen, shared by the signed-in app and the
  public sample dashboard. Desktop: a fixed sidebar (add results, navigation,
  profiles, account). Mobile: a slim top bar and a bottom tab bar.
*/
export function AppShell({
  ctx,
  profiles,
  activeId,
  plan,
  notice,
  children,
}: {
  ctx: ViewCtx;
  profiles: Profile[];
  activeId: string;
  /** Omit for the sample dashboard. */
  plan?: "free" | "pro";
  /** A full-width notice above the content (e.g. a failed payment). */
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  const demo = ctx.readOnly;
  return (
    <div className="min-h-[100dvh] text-ink lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line px-4 py-5 lg:flex print:hidden">
        <Link href={demo ? "/" : "/app"} className="px-2" aria-label="bbiom home">
          <Logo />
        </Link>

        {demo ? (
          <Button asChild className="mt-7 w-full">
            <Link href="/login">
              Start your own <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button asChild className="mt-7 w-full">
            <Link href="/app/sessions/new">
              <Plus aria-hidden /> Add results
            </Link>
          </Button>
        )}

        <div className="mt-6">
          <SideNav base={ctx.base} />
        </div>

        <div className="mt-8">
          <p className="px-3 text-xs font-medium text-ink-3">
            {profiles.length > 1 ? "Profiles" : "Profile"}
          </p>
          <div className="mt-2">
            <ProfileSwitcher profiles={profiles} activeId={activeId} fixed={demo} />
          </div>
        </div>

        <div className="mt-auto space-y-3 px-1">
          {demo ? (
            <p className="px-2 text-xs leading-relaxed text-ink-3">
              Sample data for an invented person. Nothing here is saved.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-2 px-2">
              <Badge tone={plan === "pro" ? "brand" : "neutral"}>
                {plan === "pro" ? "Pro plan" : "Free plan"}
              </Badge>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[0.8125rem] text-ink-3 transition-colors duration-300 hover:text-ink"
                >
                  <LogOut className="size-3.5" aria-hidden /> Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="tabbar sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 lg:hidden print:hidden">
          <Link href={demo ? "/" : "/app"} aria-label="bbiom home">
            <Logo />
          </Link>
          {demo ? (
            <Button asChild size="sm">
              <Link href="/login">Start your own</Link>
            </Button>
          ) : (
            <ProfileSwitcher profiles={profiles} activeId={activeId} layout="chips" />
          )}
        </header>

        {demo && (
          <div className="border-b border-line bg-brand-tint print:hidden">
            <p className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm text-ink-2 sm:px-8">
              <span className="font-medium text-ink">Sample dashboard.</span>
              <span className="hidden sm:inline">
                Eight years of invented results, so you can see how it reads.
              </span>
              <Link
                href="/login"
                className="font-medium text-brand underline underline-offset-4 hover:text-brand-strong lg:ml-auto"
              >
                Track your own, free
              </Link>
            </p>
          </div>
        )}
        {notice}

        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-28 pt-7 sm:px-8 lg:pb-14 lg:pt-10">
          {children}
        </main>

        <div className="pb-[64px] lg:pb-0 print:hidden">
          <Disclaimer />
        </div>
      </div>

      <div className="print:hidden">
        <TabBar base={ctx.base} />
      </div>
    </div>
  );
}
