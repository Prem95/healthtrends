import Link from "next/link";
import { getDemoData } from "@/lib/demo";
import { toDigest } from "@/lib/digest";
import { Logo } from "@/components/brand/logo";
import { MarkerCard } from "@/components/markers/marker-parts";
import { StatusSummary } from "@/components/markers/status-summary";

/*
  Frame for the sign-in and first-profile screens: the form on the left, and
  on wide screens a quiet glimpse of what the record looks like once it has
  a few tests in it (sample data, real components).
*/
export function AuthShell({ children }: { children: React.ReactNode }) {
  const digests = getDemoData()
    .summaries.filter((s) => s.latest)
    .map((s) => toDigest(s, {}));
  const ldl = digests.find((d) => d.id === "ldl-cholesterol")!;

  return (
    <div className="grid min-h-[100dvh] bg-page text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-[100dvh] flex-col px-5 py-5 sm:px-10">
        <header>
          <Link href="/" aria-label="bbiom home">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        </main>
      </div>

      <aside
        className="hidden items-center justify-center border-l border-line bg-paper-2 p-10 lg:flex"
        aria-hidden
      >
        <div className="pointer-events-none w-full max-w-md space-y-4">
          <p className="text-xs text-ink-3">Sample data</p>
          <StatusSummary digests={digests} />
          <MarkerCard d={ldl} href="/demo" />
        </div>
      </aside>
    </div>
  );
}
