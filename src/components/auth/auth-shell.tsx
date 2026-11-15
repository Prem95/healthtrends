import Link from "next/link";
import { getDemoData } from "@/lib/demo";
import { toDigest } from "@/lib/digest";
import { Logo } from "@/components/brand/logo";
import { MarkerCard } from "@/components/markers/marker-parts";
import { StatusSummary } from "@/components/markers/status-summary";

/*
  Frame for the sign-in and first-profile screens: the form on the left, and
  on wide screens a quiet glimpse of what the record looks like once it has
  a few tests in it — sample data and the real components, on the ink
  surface the landing page uses for its chart band.
*/
export function AuthShell({ children }: { children: React.ReactNode }) {
  const digests = getDemoData()
    .summaries.filter((s) => s.latest)
    .map((s) => toDigest(s, {}));
  const ldl = digests.find((d) => d.id === "ldl-cholesterol")!;

  return (
    <div className="grid min-h-[100dvh] text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-[100dvh] flex-col px-5 py-5 sm:px-10">
        <header>
          <Link href="/" aria-label="bbiom home" className="inline-block rounded-md">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        </main>
      </div>

      <aside className="hidden p-4 lg:block" aria-hidden>
        <div
          data-theme="dark"
          className="relative flex h-full flex-col justify-center rounded-[28px] bg-page px-10 py-16 xl:px-16"
        >
          <p className="display max-w-[16ch] text-display-s text-ink">
            Every blood test, <em className="text-brand">on one line.</em>
          </p>
          <div className="pointer-events-none mt-10 w-full max-w-md space-y-4">
            <StatusSummary digests={digests} />
            <MarkerCard d={ldl} href="/demo" className="h-auto" />
          </div>
          <p className="absolute inset-x-10 bottom-7 text-sm text-ink-3 xl:inset-x-16">Sample data</p>
        </div>
      </aside>
    </div>
  );
}
