import Link from "next/link";
import { ArrowRight, LineChart, ShieldCheck, TrendingUp } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";

export default function Home() {
  return (
    <div className="paper-grain flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="grid items-center gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="animate-rise">
            <p className="text-sm font-medium tracking-wide text-brand-strong uppercase">
              Personal lab-result tracker
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.02] text-ink">
              See your health as a{" "}
              <span className="italic text-brand-strong">trend</span>, not a snapshot.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
              Doctors see one visit at a time. You live the whole line. Log every blood test
              once and watch any biomarker move across the years — with its reference range,
              direction of change, and a plain-language read on where it’s heading.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Start tracking free <ArrowRight />
                </Link>
              </Button>
              <span className="text-sm text-ink-3">
                Free plan, no card. Your data is always exportable.
              </span>
            </div>
          </div>

          <HeroChart />
        </section>

        <section className="grid gap-8 border-t border-line py-16 sm:grid-cols-3">
          <Feature
            icon={<LineChart className="size-5" />}
            title="Every marker, over time"
            body="LDL, HbA1c, TSH, vitamin D — a clean line chart with the normal band shaded and out-of-range points flagged."
          />
          <Feature
            icon={<TrendingUp className="size-5" />}
            title="Drift you’d otherwise miss"
            body="We surface markers creeping toward a boundary across your last three tests — long before they read as abnormal."
          />
          <Feature
            icon={<ShieldCheck className="size-5" />}
            title="Private, and yours"
            body="Row-level isolation per account, one-click full export, one-click delete. Exporting and deleting your data is free forever."
          />
        </section>
      </main>

      <footer className="border-t border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs leading-relaxed text-ink-3">{DISCLAIMER_TEXT}</p>
          <p className="mt-3 text-xs text-ink-3">© {new Date().getFullYear()} HealthTrends</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="flex size-9 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

function HeroChart() {
  const dots: [number, number, string][] = [
    [8, 120, "var(--in-range)"],
    [84, 110, "var(--in-range)"],
    [160, 96, "var(--borderline)"],
    [236, 78, "var(--borderline)"],
    [312, 58, "var(--out)"],
  ];
  return (
    <div className="animate-rise rounded-xl border border-line bg-paper p-6 shadow-[0_1px_2px_oklch(0.5_0.02_170/0.05),0_24px_60px_-40px_oklch(0.45_0.05_180/0.35)]">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">
            LDL Cholesterol
          </p>
          <p className="mt-1 font-display text-3xl text-ink tnum">
            128 <span className="text-base text-ink-3">mg/dL</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-borderline/25 bg-borderline-soft px-2.5 py-0.5 text-xs font-medium text-borderline">
          <span className="size-1.5 rounded-full bg-current" /> Near high boundary
        </span>
      </div>
      <svg viewBox="0 0 320 150" className="mt-5 w-full" role="img" aria-label="LDL trend rising over five tests">
        <rect x="0" y="96" width="320" height="54" fill="var(--in-range-soft)" />
        <line x1="0" y1="96" x2="320" y2="96" stroke="var(--in-range)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
        <polyline
          points="8,120 84,110 160,96 236,78 312,58"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dots.map(([x, y, c], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="var(--paper)" stroke={c} strokeWidth="2.5" />
        ))}
      </svg>
      <p className="mt-4 text-sm text-ink-2">Rising across your last 3 tests — up 22% since 2023.</p>
    </div>
  );
}
