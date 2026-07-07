import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b-2 border-rule">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Start free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        {/* Hero: typographic, no card, no illustration box */}
        <section className="py-16 md:py-24">
          <p className="microlabel animate-rise">Personal lab record, kept properly</p>
          <h1 className="mt-5 max-w-3xl animate-rise font-display text-[clamp(2.6rem,7vw,4.75rem)] leading-[1.02] text-ink">
            Your blood work has a history. Start reading it.
          </h1>
          <div className="mt-8 grid gap-10 md:grid-cols-[1fr_320px] md:items-end">
            <p className="max-w-xl text-lg leading-relaxed text-ink-2">
              A doctor sees the report in front of them. You have a drawer full of older
              ones that never get compared. Type each result in once and HealthTrends
              lines them up, so a slow five-year climb in LDL stops hiding between
              appointments.
            </p>
            <div className="flex flex-col items-start gap-2">
              <Button asChild size="lg">
                <Link href="/login">Start tracking free</Link>
              </Button>
              <span className="text-sm text-ink-3">
                No card needed. Your data exports any time.
              </span>
            </div>
          </div>
        </section>

        {/* Specimen: a full-width chart drawn on the page itself */}
        <section className="rule-top py-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="microlabel">Specimen: LDL cholesterol, five tests</p>
            <p className="text-xs text-ink-3 tnum">2023.02 to 2026.01</p>
          </div>
          <SpecimenChart />
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2">
            Each dot is one blood draw. The shaded band is the reference range. The last
            three points rise 22%, the kind of slow drift this app is built to catch
            while it is still just a question for your next appointment.
          </p>
        </section>

        {/* Numbered feature rows, set like a requisition form */}
        <section className="rule-top py-12">
          <ol className="divide-y divide-line">
            <FeatureRow
              n="01"
              title="Enter a 20-marker report in under three minutes"
              body="Panel shortcuts for lipids, CBC, metabolic and thyroid pre-fill the rows. You type values, nothing else."
            />
            <FeatureRow
              n="02"
              title="Statuses come from the range on your own report"
              body="If your lab printed 0.35 to 4.94 for TSH, that range wins over the textbook default. Sex-specific and one-sided ranges are handled correctly."
            />
            <FeatureRow
              n="03"
              title="Drift gets flagged before it becomes a problem"
              body="Three consecutive tests moving the same way by 10% or more puts a marker on your dashboard."
            />
            <FeatureRow
              n="04"
              title="The data stays yours"
              body="Row-level isolation per account. CSV and JSON export, plus full account deletion, are free forever."
            />
          </ol>
        </section>

        {/* Plain pricing line, not a pricing-card grid */}
        <section className="rule-top flex flex-wrap items-baseline justify-between gap-4 py-10">
          <div>
            <p className="microlabel">Pricing</p>
            <p className="mt-2 max-w-lg text-ink-2">
              Free covers one profile and 20 test sessions. Pro is $4.99 a month or $39 a
              year for six family profiles, unlimited sessions and a printable summary
              for your doctor.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/login">Create an account</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t-2 border-rule bg-paper-2">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <p className="text-xs leading-relaxed text-ink-3">{DISCLAIMER_TEXT}</p>
          <p className="mt-3 text-xs text-ink-3">© {new Date().getFullYear()} HealthTrends</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="grid gap-2 py-6 md:grid-cols-[64px_1fr_1.1fr] md:gap-8">
      <span className="font-display text-2xl text-ink-3 tnum">{n}</span>
      <h3 className="font-display text-xl leading-snug text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-2">{body}</p>
    </li>
  );
}

/* A wide, flat plot drawn directly on the page. No container card. */
function SpecimenChart() {
  const dots: [number, number, string][] = [
    [40, 128, "var(--in-range)"],
    [240, 118, "var(--in-range)"],
    [440, 102, "var(--borderline)"],
    [640, 84, "var(--borderline)"],
    [840, 62, "var(--out)"],
  ];
  return (
    <svg
      viewBox="0 0 880 160"
      className="mt-6 w-full"
      role="img"
      aria-label="Line chart of LDL cholesterol rising across five tests, ending above the reference range"
    >
      {/* reference band: under 100 mg/dL */}
      <rect x="0" y="102" width="880" height="58" fill="var(--in-range-soft)" />
      <line x1="0" y1="102" x2="880" y2="102" stroke="var(--in-range)" strokeWidth="1" strokeDasharray="5 4" opacity="0.7" />
      <text x="8" y="152" fontSize="11" fill="var(--ink-3)">reference range</text>
      <text x="848" y="96" fontSize="11" fill="var(--out)" textAnchor="end">128 mg/dL</text>
      <polyline
        points="40,128 240,118 440,102 640,84 840,62"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      {dots.map(([x, y, c], i) => (
        <rect key={i} x={x - 4} y={y - 4} width="8" height="8" fill="var(--paper)" stroke={c} strokeWidth="2.5" />
      ))}
    </svg>
  );
}
