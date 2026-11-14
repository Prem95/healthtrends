import Link from "next/link";
import { getDemoData } from "@/lib/demo";
import { toDigest } from "@/lib/digest";
import { Logo } from "@/components/brand/logo";
import { Art } from "@/components/ui/art";
import { MarkerCard } from "@/components/markers/marker-parts";
import { StatusSummary } from "@/components/markers/status-summary";

/*
  Frame for the sign-in and first-profile screens: the form on the left, and
  on wide screens a quiet glimpse of what the record looks like once it has
  a few tests in it (sample data, real components, floated as glass on the
  painted artwork).
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
          <Link href="/" aria-label="bbiom home">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        </main>
      </div>

      <aside className="hidden p-4 lg:block" aria-hidden>
        <Art name="hero" priority className="flex h-full items-center justify-center p-10">
          <div className="pointer-events-none w-full max-w-md space-y-4">
            <StatusSummary digests={digests} className="glass" />
            <MarkerCard d={ldl} href="/demo" className="glass h-auto" />
          </div>
          <p className="absolute inset-x-8 bottom-6 text-sm text-white/85">Sample data</p>
        </Art>
      </aside>
    </div>
  );
}
