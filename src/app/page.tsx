import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Download,
  FileText,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { BUILTIN_BIOMARKERS, BUILTIN_COUNT } from "@/lib/catalog";
import { getDemoData } from "@/lib/demo";
import { toDigest } from "@/lib/digest";
import {
  CATEGORY_LABEL,
  formatInUnit,
  type ResultStatus,
} from "@/lib/domain";
import { CATEGORY_COMMON_ORDER, sortByCommonality } from "@/lib/commonality";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import type { BiomarkerSummary } from "@/lib/analytics";
import { cn, formatDate } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";
import { Art, type ArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { StatusBadge, StatusGlyph } from "@/components/ui/status-badge";
import { RangeBar } from "@/components/charts/range-bar";
import { Sparkline } from "@/components/charts/sparkline";
import { Reveal } from "@/components/motion/reveal";
import { MarkerCard, MarkerList, MarkerRow } from "@/components/markers/marker-parts";
import { StatusSummary } from "@/components/markers/status-summary";
import { MarkerShowcase, type ShowcaseMarker } from "@/components/landing/marker-showcase";
import { NAV_LINKS } from "@/components/landing/nav-links";
import { SiteNav } from "@/components/landing/site-nav";

/*
  The marketing page. It sells the product by showing it: every preview below
  is the real app component rendered over the sample profile (lib/demo),
  floated as frosted glass on the painted green-to-orange artwork, and the
  sample dashboard itself is one click away at /demo. Copy states only what
  the product does today.
*/

const WRAP = "mx-auto w-full max-w-[1280px] px-4 sm:px-6";
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

  const checks = ["Free for one profile", "No card needed", "Export or delete any time"];

  return (
    <div id="top" className="flex min-h-[100dvh] flex-col text-ink">
      <SiteNav />

      <main className="flex-1">
        {/* ------------------------------------------------------------ HERO */}
        <section className="pt-3 sm:pt-4">
          <div className={WRAP}>
            {/* Phone and tablet: the headline sits on the painting */}
            <Art
              name="hero"
              scrim
              flip
              priority
              sizes="100vw"
              className="flex min-h-[620px] flex-col p-5 sm:min-h-[700px] sm:p-10 lg:hidden"
            >
              <Link
                href="/demo/biomarkers/ldl-cholesterol"
                className="glass mb-10 block w-full max-w-[19rem] self-end rounded-2xl p-4"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">LDL cholesterol</span>
                  <StatusBadge status={d("ldl-cholesterol").status} />
                </span>
                <span className="mt-2 flex items-end justify-between gap-3">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[2rem] font-medium leading-none tracking-[-0.03em] text-ink">
                      {d("ldl-cholesterol").valueLabel}
                    </span>
                    <span className="unit">{d("ldl-cholesterol").unit}</span>
                  </span>
                  <Sparkline values={d("ldl-cholesterol").spark} tone="var(--borderline)" width={110} height={34} />
                </span>
                <span className="mt-2 block text-xs text-ink-3">Down 54 since 2023 · sample data</span>
              </Link>
              <div className="mt-auto" />
              <p className="eyebrow text-white/75">Blood test tracker</p>
              <h1 className="display mt-4 text-[2.5rem] leading-[1.04] tracking-[-0.035em] text-white sm:text-[3.5rem]">
                Every blood test you&rsquo;ve had, on one clear timeline.
              </h1>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
                {checks.map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <Check className="size-4" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="light">
                  <Link href="/login">Start free</Link>
                </Button>
                <Button asChild size="lg" variant="glass">
                  <Link href="/demo">See the sample dashboard</Link>
                </Button>
              </div>
            </Art>
            <p className="mt-6 max-w-[38rem] px-1 text-lg leading-relaxed text-ink-2 lg:hidden">
              bbiom keeps your lab results in one place and draws each biomarker across the
              years, judged against the range on your own report.
            </p>

            {/* Desktop: words on one side, the painting and the product on the other */}
            <div className="hidden min-h-[min(840px,calc(100dvh-92px))] grid-cols-2 gap-4 lg:grid">
              <div className="card-wash flex flex-col rounded-[28px] p-12 xl:p-14">
                <p className="eyebrow">Blood test tracker</p>
                <div className="mt-auto pt-16">
                  <h1 className="display text-[clamp(2.5rem,0.8rem+3vw,4rem)] leading-[1.04] tracking-[-0.035em] text-ink">
                    Every blood test you&rsquo;ve had,{" "}
                    <span className="text-grad">on one clear timeline.</span>
                  </h1>
                  <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-2">
                    bbiom keeps your lab results in one place and draws each biomarker across
                    the years, judged against the range on your own report. See what is in
                    range, what is close to a limit, and which way it is heading.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Button asChild size="lg">
                      <Link href="/login">Start free</Link>
                    </Button>
                    <Link
                      href="/demo"
                      className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink underline decoration-line-strong underline-offset-[6px] transition-colors duration-300 hover:text-brand hover:decoration-brand"
                    >
                      Explore the sample dashboard <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </div>
                <dl className="mt-12 grid grid-cols-2 gap-x-10 gap-y-5 border-t border-line pt-7">
                  {(
                    [
                      [`${BUILTIN_COUNT} markers`, "Built in, plus any you add"],
                      ["Your lab's range", "Not a textbook one"],
                      ["Trends", "From your second test on"],
                      ["CSV and JSON", "Export any time, free"],
                    ] as const
                  ).map(([t, sub]) => (
                    <div key={t}>
                      <dt className="text-[0.9375rem] font-medium text-ink">{t}</dt>
                      <dd className="mt-0.5 text-sm text-ink-3">{sub}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <Art name="hero" priority className="flex items-center justify-center p-10 xl:p-14">
                <div className="w-full max-w-[27rem] space-y-4">
                  <StatusSummary digests={digests} className="glass" />
                  <MarkerCard
                    d={d("ldl-cholesterol")}
                    href="/demo/biomarkers/ldl-cholesterol"
                    className="glass h-auto"
                  />
                </div>
                <p className="absolute inset-x-8 bottom-6 flex items-center justify-between text-sm text-white/85">
                  <span>Sample data</span>
                  <Link href="/demo" className="inline-flex items-center gap-1.5 font-medium text-white hover:underline">
                    Open the live dashboard <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </p>
              </Art>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- DASHBOARD */}
        <section className="py-16 sm:py-24">
          <div className={WRAP}>
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">The dashboard</p>
              <h2 className={cn(H2, "mt-4")}>
                Open it and know <span className="text-ink-3">where you stand.</span>
              </h2>
              <p className={cn(LEAD, "mx-auto")}>
                One count at the top, then only the markers that deserve a second look. No
                scores, no alarm.
              </p>
            </Reveal>
            <Reveal delay={100} className="mt-10 sm:mt-12">
              <Art name="wide" sizes="100vw" className="p-3 sm:p-8 lg:p-12">
                <div className="glass rounded-[22px] p-3 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 px-2 pb-4 pt-1 sm:px-1">
                    <p className="text-sm text-ink-2">
                      <span className="font-medium text-ink">Overview</span> · {demo.profile.name}{" "}
                      · last test {formatDate(lastTest.date)}
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
              </Art>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------- HOW IT WORKS */}
        <section id="how" className="scroll-mt-20 py-16 sm:py-24">
          <div className={WRAP}>
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className={H2}>How it works</h2>
              <p className={cn(LEAD, "mx-auto")}>
                It starts with the report you already have, <span className="text-ink-3">then the
                picture builds itself.</span>
              </p>
            </Reveal>

            <ol className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-5">
              <Step
                n="1"
                art="step1"
                title="Add a report"
                body="Type in the numbers from any lab report, new or old. Panel shortcuts fill in the rows, so twenty results take about three minutes."
              >
                <div className="glass-dark flex w-full max-w-[21rem] items-center gap-4 rounded-2xl p-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
                    <ClipboardList className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.0625rem] font-medium leading-tight">
                      Lipid panel added
                    </span>
                    <span className="mt-1 block truncate text-sm text-white/70">
                      5 results · {formatDate(lastTest.date)}
                    </span>
                  </span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-ink">
                    <Check className="size-4" />
                  </span>
                </div>
              </Step>
              <Step
                n="2"
                art="step2"
                title="See where each result sits"
                body="Every value lands on a bar against its reference range: the one printed on your report if you enter it, a standard one if you don't."
                delay={80}
              >
                <div className="glass w-full max-w-[21rem] space-y-3.5 rounded-2xl p-4">
                  {[d("hdl-cholesterol"), d("hba1c"), d("vitamin-d")].map((m) => (
                    <div key={m.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-ink">
                          {m.name.replace(" (25-OH)", "").replace(" Cholesterol", "")}
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
                art="step3"
                title="Watch the line build"
                body="From the second test on, each marker becomes a line. Note a new medication or a change of diet and see what the numbers did afterwards."
                delay={160}
              >
                <div className="glass w-full max-w-[21rem] rounded-2xl p-4">
                  <p className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink">LDL cholesterol</span>
                    <span className="text-xs text-ink-3">2019 to 2026</span>
                  </p>
                  <MiniTrend
                    s={summary("ldl-cholesterol")}
                    eventDate="2023-04-03"
                    eventLabel="Started statin"
                  />
                </div>
              </Step>
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- TRENDS */}
        <section id="trends" className="scroll-mt-20 py-16 sm:py-24">
          <div className={WRAP}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
              <Reveal className="lg:sticky lg:top-28 lg:h-fit">
                <p className="eyebrow">Trends</p>
                <h2 className={cn(H2, "mt-4")}>
                  One marker. Every year. <span className="text-ink-3">One line.</span>
                </h2>
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
                        "Each point is one test",
                        "Shaped and coloured by where it fell, against the range that applied that day.",
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
                <Art name="cta" ribbed className="p-3 sm:p-6 lg:p-8">
                  <div className="rounded-2xl shadow-[var(--shadow-float)]">
                    <MarkerShowcase markers={showcase} />
                  </div>
                </Art>
              </Reveal>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- READING RESULTS */}
        <section className="py-16 sm:py-24">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">Reading a result</p>
              <h2 className={cn(H2, "mt-4 max-w-[18ch]")}>
                Four states, <span className="text-ink-3">in plain words.</span>
              </h2>
              <p className={LEAD}>
                Just where a number sits against its range, said the way you would say it out
                loud. Each state has its own shape as well as its own colour.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["IN_RANGE", "In range", "Inside the reference range, with room to spare.", "var(--in-range-soft)"],
                  [
                    "BORDERLINE_HIGH",
                    "Borderline",
                    "Still inside, but within 10% of a limit. Worth watching, not a verdict.",
                    "var(--borderline-soft)",
                  ],
                  [
                    "HIGH",
                    "High or low",
                    "Outside the range. The arrow points the way it has gone.",
                    "var(--out-soft)",
                  ],
                  [
                    "NO_RANGE",
                    "No range",
                    "Tracked and plotted, but not judged until a range is known.",
                    "var(--paper-3)",
                  ],
                ] as [ResultStatus, string, string, string][]
              ).map(([status, title, body, tint]) => (
                <div
                  key={status}
                  className="card rounded-[20px] p-6"
                  style={{ background: `linear-gradient(168deg, ${tint} 0%, var(--paper) 58%)` }}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-paper">
                    <StatusGlyph status={status} size={16} />
                  </span>
                  <p className="mt-5 text-lg font-medium text-ink">{title}</p>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- MARKERS */}
        <section id="markers" className="scroll-mt-20 py-16 sm:py-24">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">What you can track</p>
              <h2 className={cn(H2, "mt-4 max-w-[20ch]")}>
                {BUILTIN_COUNT} blood markers{" "}
                <span className="text-ink-3">across ten body systems.</span>
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
                <div key={category} className="card rounded-[20px] p-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium text-ink">{CATEGORY_LABEL[category]}</h3>
                    <p className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-3 tnum">
                      {names.length}
                    </p>
                  </div>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-2">
                    {names.slice(0, 5).join(", ")}
                    {names.length > 5 && (
                      <span className="text-ink-3"> and {names.length - 5} more</span>
                    )}
                  </p>
                </div>
              ))}
              <div className="card-wash p-6 sm:col-span-2">
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
        <section className="py-16 sm:py-24">
          <div className={WRAP}>
            <Reveal>
              <p className="eyebrow">Made for real life</p>
              <h2 className={cn(H2, "mt-4 max-w-[20ch]")}>
                For the appointment,{" "}
                <span className="text-ink-3">and for the people you look after.</span>
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Reveal className="card flex flex-col rounded-[24px] p-6 sm:p-8">
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink">
                  One page for your doctor
                </h3>
                <p className="mt-2 max-w-[30rem] text-[0.9375rem] leading-relaxed text-ink-2">
                  What is outside its range comes first, then every latest result with its date
                  and reference. It prints as plain ink on paper, ready to hand over.
                </p>
                <div className="card-wash mt-6 p-4" aria-hidden>
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

              <Reveal delay={80} className="card flex flex-col rounded-[24px] p-6 sm:p-8">
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink">
                  The whole household in one account
                </h3>
                <p className="mt-2 max-w-[30rem] text-[0.9375rem] leading-relaxed text-ink-2">
                  Keep a parent&rsquo;s results next to your own. Each profile has its own
                  history, and its own ranges where they differ by sex.
                </p>
                <div className="card-wash mt-6 space-y-1 p-3" aria-hidden>
                  {[
                    ["Alex", "22 markers · last test Sep 2026", true],
                    ["Mum", "31 markers · last test Jun 2026", false],
                    ["Dad", "18 markers · last test Feb 2026", false],
                  ].map(([name, meta, active]) => (
                    <div
                      key={name as string}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2",
                        active && "bg-paper ring-1 ring-line-strong",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full text-xs font-medium",
                          active ? "bg-[image:var(--grad-brand)] text-white" : "bg-paper-3 text-ink-2",
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
        <section id="privacy" className="scroll-mt-20 py-8 sm:py-12">
          <div className={WRAP}>
            <Art name="deep" sizes="100vw" className="px-6 py-14 text-white sm:px-12 sm:py-20">
              <Reveal>
                <p className="eyebrow text-white/65">Privacy and ownership</p>
                <h2 className="display mt-4 max-w-[18ch] text-[clamp(1.875rem,1.2rem+2.4vw,3rem)] text-white">
                  These are your results. <span className="text-white/60">They stay yours.</span>
                </h2>
              </Reveal>
              <Reveal delay={80} className="mt-10 grid gap-4 sm:grid-cols-2">
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
                  <div key={title} className="glass-dark flex gap-4 rounded-[20px] p-5 sm:p-6">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-medium">{title}</h3>
                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-white/75">{body}</p>
                    </div>
                  </div>
                ))}
              </Reveal>
              <p className="mt-10 max-w-[40rem] text-[0.9375rem] leading-relaxed text-white/70">
                bbiom is a record, not a diagnosis. It shows the numbers you enter and how they
                have moved, so the conversation with your doctor starts further along.
              </p>
            </Art>
          </div>
        </section>

        {/* --------------------------------------------------------- PRICING */}
        <section id="pricing" className="scroll-mt-20 py-16 sm:py-24">
          <div className={WRAP}>
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Pricing</p>
              <h2 className={cn(H2, "mt-4")}>
                Free to track. <span className="text-ink-3">Pro when you need more.</span>
              </h2>
            </Reveal>
            <Reveal delay={80} className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-2">
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
        <section className="py-16 sm:py-24">
          <div className={cn(WRAP, "grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]")}>
            <Reveal>
              <p className="eyebrow">Questions</p>
              <h2 className={cn(H2, "mt-4")}>
                Before <span className="text-ink-3">you start.</span>
              </h2>
            </Reveal>
            <Reveal delay={80} className="card rounded-[24px] px-6 sm:px-8">
              {FAQ.map(([q, a]) => (
                <details key={q} name="faq" className="acc border-t border-line first:border-t-0">
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
        <section className="pb-16 sm:pb-24">
          <div className={WRAP}>
            <Art
              name="cta"
              scrim
              sizes="100vw"
              className="px-6 py-20 text-center text-white sm:px-12 sm:py-28"
            >
              <Reveal>
                <h2 className="display mx-auto max-w-[18ch] text-[clamp(2rem,1.2rem+3.2vw,3.75rem)] text-white">
                  Start with the report you already have.
                </h2>
                <p className="mx-auto mt-5 max-w-[32rem] text-lg leading-relaxed text-white/85">
                  One report takes about three minutes. The second one gives you your first
                  trend.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg" variant="light">
                    <Link href="/login">Start free</Link>
                  </Button>
                  <Button asChild size="lg" variant="glass">
                    <Link href="/demo">
                      Explore the sample dashboard <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </Reveal>
            </Art>
          </div>
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

/* A numbered step: a painted card holding one frosted piece of the product,
   with its title and a sentence centred underneath. */
function Step({
  n,
  art,
  title,
  body,
  delay = 0,
  children,
}: {
  n: string;
  art: ArtName;
  title: string;
  body: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Reveal as="li" delay={delay} className="flex flex-col">
      <Art
        name={art}
        sizes="(min-width: 1024px) 33vw, 100vw"
        className="flex aspect-[4/3] items-center justify-center rounded-[24px] p-5 sm:p-8 lg:aspect-[5/4]"
      >
        <span className="glass-dark absolute left-4 top-4 grid size-9 place-items-center rounded-[10px] text-sm font-medium tnum">
          {n}
        </span>
        <div className="flex w-full justify-center" aria-hidden>
          {children}
        </div>
      </Art>
      <h3 className="mt-6 text-center text-xl font-medium tracking-[-0.01em] text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-[26rem] text-center text-[0.9375rem] leading-relaxed text-ink-2">
        {body}
      </p>
    </Reveal>
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
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 block h-auto w-full">
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
          stroke="#ffffff"
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
  const body = (
    <>
      <h3 className="text-base font-medium">{name}</h3>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-[3.25rem] font-medium leading-none tracking-[-0.035em]">{price}</span>
        {per && <span className={featured ? "text-white/70" : "text-ink-3"}>{per}</span>}
      </p>
      <p className={cn("mt-3 text-sm", featured ? "text-white/75" : "text-ink-3")}>{note}</p>
      <ul
        className={cn(
          "mt-6 flex-1 space-y-3 border-t pt-6",
          featured ? "border-white/20" : "border-line",
        )}
      >
        {features.map((f) => (
          <li
            key={f}
            className={cn(
              "flex items-start gap-3 text-[0.9375rem]",
              featured ? "text-white/90" : "text-ink-2",
            )}
          >
            <Check
              className={cn("mt-0.5 size-4 shrink-0", featured ? "text-white" : "text-brand")}
              aria-hidden
            />
            {f}
          </li>
        ))}
      </ul>
      <Button asChild size="lg" variant={featured ? "light" : "secondary"} className="mt-8 w-full">
        <Link href="/login">{cta}</Link>
      </Button>
    </>
  );
  return featured ? (
    <Art name="deep" className="flex flex-col p-7 text-white sm:p-9">
      {body}
    </Art>
  ) : (
    <div className="card flex flex-col rounded-[28px] p-7 text-ink sm:p-9">{body}</div>
  );
}
