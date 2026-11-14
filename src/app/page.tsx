import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { BUILTIN_BIOMARKERS, BUILTIN_COUNT } from "@/lib/catalog";
import { getDemoData } from "@/lib/demo";
import { toDigest, type MarkerDigest } from "@/lib/digest";
import {
  CATEGORY_LABEL,
  PANELS,
  formatInUnit,
  type ResultStatus,
} from "@/lib/domain";
import { CATEGORY_COMMON_ORDER, sortByCommonality } from "@/lib/commonality";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import type { BiomarkerSummary } from "@/lib/analytics";
import { cn, formatDate } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { StatusBadge, StatusGlyph } from "@/components/ui/status-badge";
import { RangeBar } from "@/components/charts/range-bar";
import { Reveal } from "@/components/motion/reveal";
import { MarkerCard, MarkerList, MarkerRow } from "@/components/markers/marker-parts";
import { StatusSummary } from "@/components/markers/status-summary";
import { MarkerShowcase, type ShowcaseMarker } from "@/components/landing/marker-showcase";
import { NAV_LINKS } from "@/components/landing/nav-links";
import { SiteNav } from "@/components/landing/site-nav";

/*
  The marketing page. It sells the product by showing it: every preview below
  is the real app component rendered over the sample profile (lib/demo), and
  the sample dashboard itself is one click away at /demo. Copy states only
  what the product does today.
*/

const WRAP = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const H2 = "display text-[clamp(1.875rem,1.2rem+2.4vw,3rem)] text-ink";
const LEAD = "mt-4 max-w-[40rem] text-lg leading-relaxed text-ink-2";

export default function Home() {
  const demo = getDemoData();
  const digests = demo.summaries.filter((s) => s.latest).map((s) => toDigest(s, {}));
  const byId = new Map(digests.map((d) => [d.id, d]));
  const d = (id: string) => byId.get(id)!;
  const summary = (id: string) => demo.summaries.find((s) => s.biomarker.id === id)!;
  const lastTest = demo.sessions[0];

  const showcase: ShowcaseMarker[] = [
    {
      id: "ldl-cholesterol",
      label: "LDL",
      story:
        "Five years of slow climb that no single report made obvious, then back under 100 within a year of starting a statin.",
      events: ["Started statin"],
    },
    {
      id: "fasting-glucose",
      label: "Glucose",
      story:
        "Every result looked fine on its own. Lined up, they show a steady drift that crossed the upper limit in 2025.",
      events: [],
    },
    {
      id: "vitamin-d",
      label: "Vitamin D",
      story:
        "Low for years, into range on a supplement, and sliding again after stopping. The two notes on the line explain both turns.",
      events: ["Started vitamin D", "Stopped vitamin D"],
    },
  ].map(({ id, label, story, events }) => {
    const s = summary(id);
    return {
      id,
      name: s.biomarker.name.replace(" (25-OH)", ""),
      label,
      unit: s.biomarker.canonicalUnit,
      points: s.points,
      bandRange: s.bandRange,
      events: demo.events.filter((e) => events.includes(e.label)),
      story,
    };
  });

  const systems = CATEGORY_COMMON_ORDER.map((category) => ({
    category,
    names: sortByCommonality(BUILTIN_BIOMARKERS.filter((b) => b.category === category)).map(
      (b) => b.name,
    ),
  }));

  return (
    <div id="top" className="flex min-h-[100dvh] flex-col bg-page text-ink">
      <SiteNav />

      <main className="flex-1">
        {/* ------------------------------------------------------------ HERO */}
        <section className="overflow-hidden pb-16 pt-14 sm:pb-24 sm:pt-20">
          <div className={WRAP}>
            <div className="max-w-3xl">
              <p className="eyebrow">Blood test tracker</p>
              <h1 className="display mt-5 text-[clamp(2.375rem,1.3rem+4.6vw,4.5rem)] leading-[1.03] tracking-[-0.035em] text-ink">
                Every blood test you&rsquo;ve had, on one clear timeline.
              </h1>
              <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-ink-2 sm:text-xl sm:leading-relaxed">
                bbiom keeps your lab results in one place and draws each biomarker across the
                years, judged against the range on your own report. You see what is in range,
                what is close to a limit, and which way it is heading.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/login">Start free</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/demo">
                    Explore the sample dashboard <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-3">
                {["Free for one profile", "No card needed", "Export or delete your data any time"].map(
                  (t) => (
                    <li key={t} className="inline-flex items-center gap-1.5">
                      <Check className="size-4 text-brand" aria-hidden />
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* The product, not a picture of it */}
            <Reveal delay={120} className="mt-14 sm:mt-16">
              <div className="rounded-[22px] border border-line-strong bg-paper-2 p-3 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-2 pb-4 pt-1 sm:px-1">
                  <p className="text-sm text-ink-2">
                    <span className="font-medium text-ink">Overview</span> · {demo.profile.name} ·
                    last test {formatDate(lastTest.date)}
                  </p>
                  <p className="text-xs text-ink-3">Sample data</p>
                </div>
                <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                  <StatusSummary digests={digests} />
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                    <MarkerCard d={d("fasting-glucose")} href="/demo/biomarkers/fasting-glucose" />
                    <div className="hidden h-full sm:block">
                      <MarkerCard d={d("vitamin-d")} href="/demo/biomarkers/vitamin-d" />
                    </div>
                  </div>
                </div>
                <MarkerList className="mt-3 hidden sm:mt-4 sm:block">
                  {["ldl-cholesterol", "hba1c", "tsh"].map((id) => (
                    <MarkerRow key={id} d={d(id)} href={`/demo/biomarkers/${id}`} />
                  ))}
                </MarkerList>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------- HOW IT WORKS */}
        <section id="how" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">How it works</p>
              <h2 className={cn(H2, "mt-4 max-w-[20ch]")}>
                From a drawer of reports to a record you can read.
              </h2>
            </Reveal>

            <ol className="mt-12 grid gap-5 lg:grid-cols-3">
              <Step
                n="1"
                title="Add a report"
                body="Type in the numbers from any lab report, new or old. Panel shortcuts fill in the rows for a lipid panel or a full blood count, so twenty results take about three minutes."
              >
                <EntryVisual digests={[d("ldl-cholesterol"), d("hdl-cholesterol"), d("triglycerides")]} />
              </Step>
              <Step
                n="2"
                title="See where each result sits"
                body="Every value lands on a bar against its reference range: the one printed on your report if you enter it, a standard one if you don't."
                delay={80}
              >
                <div className="space-y-4">
                  {[d("hdl-cholesterol"), d("hba1c"), d("vitamin-d")].map((m) => (
                    <div key={m.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-ink">
                          {m.name.replace(" (25-OH)", "")}
                          <span className="ml-2 font-normal text-ink-3 tnum">
                            {m.valueLabel} {m.unit}
                          </span>
                        </p>
                        <StatusBadge status={m.status} />
                      </div>
                      <RangeBar
                        value={m.value!}
                        min={m.rangeMin}
                        max={m.rangeMax}
                        status={m.status}
                        className="mt-2.5"
                      />
                    </div>
                  ))}
                </div>
              </Step>
              <Step
                n="3"
                title="Watch the line build"
                body="From the second test on, each marker becomes a line. Note a new medication or a change of diet and see what the numbers did afterwards."
                delay={160}
              >
                <MiniTrend s={summary("ldl-cholesterol")} eventDate="2023-04-03" eventLabel="Started statin" />
              </Step>
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- TRENDS */}
        <section id="trends" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
          <div className={WRAP}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <Reveal className="lg:sticky lg:top-28 lg:h-fit">
                <p className="eyebrow">Trends</p>
                <h2 className={cn(H2, "mt-4")}>One marker. Every year. One line.</h2>
                <p className={LEAD}>
                  A single result tells you where you stood that day. The line tells you where
                  you are going, which is usually the question you walked in with.
                </p>
                <dl className="mt-8 space-y-5">
                  {(
                    [
                      [
                        "The band is the reference range",
                        "Shaded behind the line, so in or out is a glance, not arithmetic.",
                      ],
                      [
                        "Each dot is one test",
                        "Coloured by where it fell, against the range that applied that day.",
                      ],
                      [
                        "Life events sit on the line",
                        "A change in direction has its reason written beside it.",
                      ],
                      [
                        "Units switch, values don't change",
                        `mg/dL or mmol/L: ${d("ldl-cholesterol").valueLabel} mg/dL is ${formatInUnit(summary("ldl-cholesterol").biomarker, d("ldl-cholesterol").value!, "mmol/L")} mmol/L, converted for you.`,
                      ],
                    ] as const
                  ).map(([t, body]) => (
                    <div key={t} className="border-t border-line pt-4">
                      <dt className="font-medium text-ink">{t}</dt>
                      <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink-2">{body}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>
              <Reveal delay={100} className="min-w-0">
                <MarkerShowcase markers={showcase} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- READING RESULTS */}
        <section className="border-t border-line py-20 sm:py-28">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">Reading a result</p>
              <h2 className={cn(H2, "mt-4 max-w-[18ch]")}>Four states, in plain words.</h2>
              <p className={LEAD}>
                No scores, no traffic-light verdicts on your health. Just where a number sits
                against its range, said the way you would say it out loud. Each state has its
                own shape as well as its own colour.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["IN_RANGE", "In range", "Inside the reference range, with room to spare."],
                  [
                    "BORDERLINE_HIGH",
                    "Borderline",
                    "Still inside, but within 10% of a limit. Worth watching, not a verdict.",
                  ],
                  [
                    "HIGH",
                    "High or low",
                    "Outside the range. The arrow points the way it has gone.",
                  ],
                  [
                    "NO_RANGE",
                    "No range",
                    "Tracked and plotted, but not judged until a range is known.",
                  ],
                ] as [ResultStatus, string, string][]
              ).map(([status, title, body]) => (
                <div key={status} className="card p-5">
                  <StatusGlyph status={status} size={18} />
                  <p className="mt-4 font-medium text-ink">{title}</p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- MARKERS */}
        <section id="markers" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">What you can track</p>
              <h2 className={cn(H2, "mt-4 max-w-[20ch]")}>
                {BUILTIN_COUNT} blood markers across ten body systems.
              </h2>
              <p className={LEAD}>
                The ones on an ordinary annual check come first. Each has its usual units, its
                standard range, and the abbreviations labs print, so{" "}
                <span className="whitespace-nowrap">&ldquo;A1c&rdquo;</span> and{" "}
                <span className="whitespace-nowrap">&ldquo;HbA1c&rdquo;</span> find the same thing.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {systems.map(({ category, names }) => (
                <div key={category} className="card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium text-ink">{CATEGORY_LABEL[category]}</h3>
                    <p className="text-xs text-ink-3 tnum">{names.length}</p>
                  </div>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-2">
                    {names.slice(0, 5).join(", ")}
                    {names.length > 5 && (
                      <span className="text-ink-3"> and {names.length - 5} more</span>
                    )}
                  </p>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-rule p-5 sm:col-span-2">
                <h3 className="flex items-center gap-2 font-medium text-ink">
                  <Plus className="size-4" aria-hidden /> Not on the list?
                </h3>
                <p className="mt-2.5 max-w-[34rem] text-[0.9375rem] leading-relaxed text-ink-2">
                  Add your own marker with its unit and range, and it is tracked exactly like
                  the built-in ones. If your lab uses a different range, set it once for that
                  marker or enter it with a result.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------- REAL LIFE */}
        <section className="border-t border-line py-20 sm:py-28">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">Made for real life</p>
              <h2 className={cn(H2, "mt-4 max-w-[20ch]")}>
                For the appointment, and for the people you look after.
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Reveal className="card flex flex-col p-6 sm:p-7">
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink">
                  One page for your doctor
                </h3>
                <p className="mt-2 max-w-[30rem] text-[0.9375rem] leading-relaxed text-ink-2">
                  What is outside its range comes first, then every latest result with its date
                  and reference. It prints as plain ink on paper, ready to hand over.
                </p>
                <div className="card-inset mt-6 p-4" aria-hidden>
                  <p className="flex items-center gap-2 text-xs font-medium text-ink-3">
                    <FileText className="size-3.5" /> Flagged for discussion
                  </p>
                  <ul className="mt-2 divide-y divide-line">
                    {[d("fasting-glucose"), d("vitamin-d"), d("alt")].map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="truncate text-sm font-medium text-ink">
                          {m.name.replace(" (25-OH)", "")}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="text-sm text-ink tnum">
                            {m.valueLabel} <span className="unit">{m.unit}</span>
                          </span>
                          <span className="hidden w-[8.25rem] sm:block">
                            <StatusBadge status={m.status} />
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-4 text-xs text-ink-3">Included in Pro.</p>
              </Reveal>

              <Reveal delay={80} className="card flex flex-col p-6 sm:p-7">
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink">
                  The whole household in one account
                </h3>
                <p className="mt-2 max-w-[30rem] text-[0.9375rem] leading-relaxed text-ink-2">
                  Keep a parent&rsquo;s results next to your own. Each profile has its own
                  history, and its own ranges where they differ by sex.
                </p>
                <div className="card-inset mt-6 space-y-1 p-3" aria-hidden>
                  {[
                    ["Alex", "22 markers · last test Sep 2026", true],
                    ["Mum", "31 markers · last test Jun 2026", false],
                    ["Dad", "18 markers · last test Feb 2026", false],
                  ].map(([name, meta, active]) => (
                    <div
                      key={name as string}
                      className={cn(
                        "flex items-center gap-3 rounded-[10px] px-3 py-2",
                        active && "bg-paper ring-1 ring-line-strong",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full text-xs font-medium",
                          active ? "bg-ink text-page" : "bg-paper-3 text-ink-2",
                        )}
                      >
                        {(name as string).charAt(0)}
                      </span>
                      <span className="text-sm font-medium text-ink">{name}</span>
                      <span className="ml-auto truncate text-xs text-ink-3">{meta}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-ink-3">
                  One profile is free. Pro covers up to {PLAN_LIMITS.pro.maxProfiles}.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- PRIVACY */}
        <section id="privacy" data-theme="dark" className="scroll-mt-20 py-20 sm:py-28">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">Privacy and ownership</p>
              <h2 className={cn(H2, "mt-4 max-w-[18ch]")}>
                These are your results. They stay yours.
              </h2>
            </Reveal>
            <Reveal delay={80} className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
              {(
                [
                  [
                    Lock,
                    "Private to your account",
                    "Every profile, test and result is tied to your sign-in at the database level, not just hidden in the interface.",
                  ],
                  [
                    ShieldCheck,
                    "No ad or analytics scripts",
                    "bbiom loads no third-party trackers on any page. Sign-in is a one-time email link or Google, with no password to leak.",
                  ],
                  [
                    Download,
                    "Export everything, free",
                    "Download your full history as CSV or JSON whenever you want, on every plan.",
                  ],
                  [
                    Trash2,
                    "Delete means delete",
                    "Closing your account removes every profile, test, result and note, and your sign-in with them.",
                  ],
                ] as const
              ).map(([Icon, title, body]) => (
                <div key={title} className="flex gap-4 border-t border-line pt-6">
                  <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                  <div>
                    <h3 className="font-medium text-ink">{title}</h3>
                    <p className="mt-1.5 max-w-[26rem] text-[0.9375rem] leading-relaxed text-ink-2">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </Reveal>
            <p className="mt-12 max-w-[40rem] border-t border-line pt-6 text-[0.9375rem] leading-relaxed text-ink-3">
              bbiom is a record, not a diagnosis. It shows the numbers you enter and how they
              have moved, so the conversation with your doctor starts further along.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------------- PRICING */}
        <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">Pricing</p>
              <h2 className={cn(H2, "mt-4 max-w-[18ch]")}>Free to track. Pro when you need more.</h2>
            </Reveal>
            <Reveal delay={80} className="mt-10 grid gap-5 lg:grid-cols-2">
              <PlanCard
                name="Free"
                price="$0"
                note="No card, no trial clock."
                cta="Start free"
                features={[
                  "1 profile",
                  `Up to ${PLAN_LIMITS.free.maxSessions} tests`,
                  `All ${BUILTIN_COUNT} markers, plus your own`,
                  "Trends, ranges, life events, unit switching",
                  "CSV and JSON export",
                ]}
              />
              <PlanCard
                name="Pro"
                price="$4.99"
                per="a month"
                note="Or $39 a year. Cancel any time and keep your data."
                cta="Start free, upgrade inside"
                featured
                features={[
                  `Up to ${PLAN_LIMITS.pro.maxProfiles} profiles for family`,
                  "Unlimited tests",
                  "Doctor-ready printable summary",
                  "Everything in Free",
                ]}
              />
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------- FAQ */}
        <section className="border-t border-line py-20 sm:py-28">
          <div className={cn(WRAP, "grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]")}>
            <Reveal>
              <p className="eyebrow">Questions</p>
              <h2 className={cn(H2, "mt-4")}>Before you start.</h2>
            </Reveal>
            <Reveal delay={80} className="border-b border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} name="faq" className="acc border-t border-line">
                  <summary className="flex items-center justify-between gap-6 py-5">
                    <span className="text-[1.0625rem] font-medium text-ink">{q}</span>
                    <Plus className="acc-mark size-5 shrink-0 text-ink-3" aria-hidden />
                  </summary>
                  <p className="max-w-[40rem] pb-6 text-[0.9375rem] leading-relaxed text-ink-2">
                    {a}
                  </p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------- FINAL CTA */}
        <section className="border-t border-line py-20 sm:py-28">
          <Reveal className={cn(WRAP, "text-center")}>
            <h2 className="display mx-auto max-w-[18ch] text-[clamp(2rem,1.2rem+3.2vw,3.5rem)] text-ink">
              Start with the report you already have.
            </h2>
            <p className="mx-auto mt-5 max-w-[32rem] text-lg leading-relaxed text-ink-2">
              One report takes about three minutes. The second one gives you your first trend.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/login">Start free</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/demo">
                  Explore the sample dashboard <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------------------------------------------------------- FOOTER */}
      <footer className="border-t border-line">
        <div className={cn(WRAP, "py-12")}>
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
                Your blood tests, kept in one place and read as trends.
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Footer">
              {[...NAV_LINKS, ["Sample dashboard", "/demo"], ["Sign in", "/login"]].map(
                ([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="text-sm text-ink-2 transition-colors duration-300 hover:text-brand"
                  >
                    {label}
                  </a>
                ),
              )}
            </nav>
          </div>
          <p className="mt-10 max-w-2xl border-t border-line pt-6 text-xs leading-relaxed text-ink-3">
            {DISCLAIMER_TEXT}
          </p>
          <p className="mt-3 text-xs text-ink-3">© {new Date().getFullYear()} bbiom</p>
        </div>
      </footer>
    </div>
  );
}

const FAQ: [string, string][] = [
  [
    "Do I have to type my results in?",
    "Yes. You enter the values from your report by hand. Panel shortcuts add the rows for common panels in one tap, you can enter values in the unit your lab printed, and bbiom warns you when a number looks like a slipped decimal or the wrong unit before it saves.",
  ],
  [
    "Which reference range does it use?",
    "The most specific one it has. A range you enter alongside a result (the one printed on that report) always wins for that result. Otherwise it uses a range you have set for that marker, and failing that the standard range for the profile's sex.",
  ],
  [
    "What does borderline mean?",
    "The value is inside its reference range but within 10% of one of the limits. It is a prompt to keep an eye on the trend, not a finding.",
  ],
  [
    "My lab reports in different units.",
    "Enter each result in whichever unit the report uses. Common conversions such as mg/dL and mmol/L are built in, and you can switch the unit a marker is shown in at any time without re-entering anything.",
  ],
  [
    "Is this medical advice?",
    "No. bbiom records the values you enter and shows how they compare with a reference range over time. Ranges vary by lab and by person, so talk through your results with your healthcare provider.",
  ],
  [
    "What happens to my data if I stop using it?",
    "You can export everything as CSV or JSON for free, on any plan. Deleting your account removes all profiles, tests, results and notes along with your sign-in.",
  ],
];

function Step({
  n,
  title,
  body,
  delay = 0,
  children,
}: {
  n: string;
  title: string;
  body: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal as="li" delay={delay} className="card flex flex-col p-6">
      <span className="grid size-8 place-items-center rounded-full bg-paper-3 text-sm font-medium text-ink tnum">
        {n}
      </span>
      <h3 className="mt-5 text-xl font-medium tracking-[-0.01em] text-ink">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{body}</p>
      <div className="card-inset mt-6 flex flex-1 flex-col justify-center p-4" aria-hidden>
        {children}
      </div>
    </Reveal>
  );
}

/* Step 1 illustration: panel shortcuts and the first rows of a lipid panel. */
function EntryVisual({ digests }: { digests: MarkerDigest[] }) {
  const panels = PANELS.slice(0, 3).map((p) => p.name);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {panels.map((p, i) => (
          <span
            key={p}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              i === 0 ? "border-ink bg-ink text-page" : "border-line-strong bg-paper text-ink-2",
            )}
          >
            {p}
          </span>
        ))}
        <span className="px-1 py-1 text-xs text-ink-3">+{PANELS.length - panels.length} more</span>
      </div>
      <div className="mt-4 space-y-2">
        {digests.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{m.name}</span>
            <span className="w-16 rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-right text-sm font-medium text-ink tnum">
              {m.valueLabel}
            </span>
            <span className="unit w-11 text-xs">{m.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DOT: Record<string, string> = {
  IN_RANGE: "var(--in-range)",
  BORDERLINE_HIGH: "var(--borderline)",
  BORDERLINE_LOW: "var(--borderline)",
  HIGH: "var(--out)",
  LOW: "var(--out)",
  NO_RANGE: "var(--neutral-status)",
};

/* Step 3 illustration: a small static version of the marker chart. */
function MiniTrend({
  s,
  eventDate,
  eventLabel,
}: {
  s: BiomarkerSummary;
  eventDate: string;
  eventLabel: string;
}) {
  const W = 300;
  const H = 132;
  const pad = { t: 24, r: 10, b: 10, l: 10 };
  const ts = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
  const pts = s.points.map((p) => ({ ...p, t: ts(p.date) }));
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const max = s.bandRange?.max ?? Math.max(...pts.map((p) => p.value));
  const lo = Math.min(...pts.map((p) => p.value), max) - 22;
  const hi = Math.max(...pts.map((p) => p.value), max) + 8;
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ex = x(ts(eventDate));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
      <rect
        x={pad.l}
        y={y(max)}
        width={W - pad.l - pad.r}
        height={H - pad.b - y(max)}
        fill="var(--in-range)"
        opacity={0.12}
      />
      <line x1={pad.l} x2={W - pad.r} y1={y(max)} y2={y(max)} stroke="var(--in-range)" strokeOpacity={0.5} />
      <line x1={ex} x2={ex} y1={pad.t - 6} y2={H - pad.b} stroke="var(--chart-axis)" />
      <text x={ex + 5} y={pad.t - 9} fontSize={11} fill="var(--ink-2)">
        {eventLabel}
      </text>
      <polyline
        points={pts.map((p) => `${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="var(--chart-line)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p) => (
        <circle
          key={p.resultId}
          cx={x(p.t)}
          cy={y(p.value)}
          r={5}
          fill={DOT[p.status]}
          stroke="var(--paper-2)"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

function PlanCard({
  name,
  price,
  per,
  note,
  cta,
  features,
  featured = false,
}: {
  name: string;
  price: string;
  per?: string;
  note: string;
  cta: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div className={cn("card flex flex-col p-6 sm:p-8", featured && "border-ink")}>
      <h3 className="text-base font-medium text-ink">{name}</h3>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-[3rem] font-medium leading-none tracking-[-0.035em] text-ink">
          {price}
        </span>
        {per && <span className="text-ink-3">{per}</span>}
      </p>
      <p className="mt-3 text-sm text-ink-3">{note}</p>
      <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-[0.9375rem] text-ink-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <Button asChild size="lg" variant={featured ? "primary" : "secondary"} className="mt-8 w-full">
        <Link href="/login">{cta}</Link>
      </Button>
    </div>
  );
}
