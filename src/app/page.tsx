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
import { CATEGORY_LABEL, type ResultStatus } from "@/lib/domain";
import { CATEGORY_COMMON_ORDER } from "@/lib/commonality";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import type { BiomarkerSummary } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";
import { Art, type ArtName } from "@/components/ui/art";
import { Button } from "@/components/ui/button";
import { StatusBadge, StatusGlyph } from "@/components/ui/status-badge";
import { RangeBar } from "@/components/charts/range-bar";
import { Sparkline } from "@/components/charts/sparkline";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { MarkerCard } from "@/components/markers/marker-parts";
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
const SECTION = "py-14 sm:py-20";

type Vars = React.CSSProperties & Record<`--${string}`, string>;
const at = (ms: number): Vars => ({ "--d": `${ms}ms` });

export default function Home() {
  const demo = getDemoData();
  const digests = demo.summaries.filter((s) => s.latest).map((s) => toDigest(s, {}));
  const byId = new Map(digests.map((d) => [d.id, d]));
  const d = (id: string) => byId.get(id)!;
  const summary = (id: string) => demo.summaries.find((s) => s.biomarker.id === id)!;

  const showcase: ShowcaseMarker[] = [
    { id: "ldl-cholesterol", label: "LDL", story: "Climbed for years. Back under 100 after a statin.", events: ["Started statin"] },
    { id: "fasting-glucose", label: "Glucose", story: "Each result looked fine. Together, a steady drift.", events: [] },
    { id: "vitamin-d", label: "Vitamin D", story: "Up on a supplement. Down again after stopping.", events: ["Started vitamin D", "Stopped vitamin D"] },
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
    count: BUILTIN_BIOMARKERS.filter((b) => b.category === category).length,
  }));
  const maxCount = Math.max(...systems.map((s) => s.count));

  const checks = ["Free for one profile", "No card", "Export any time"];

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
              className="flex min-h-[600px] flex-col p-5 sm:min-h-[680px] sm:p-10 lg:hidden"
            >
              <Reveal anim delay={250} className="mb-10 w-full max-w-[19rem] self-end">
                <Link href="/demo/biomarkers/ldl-cholesterol" className="glass block rounded-2xl p-4">
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
                </Link>
              </Reveal>
              <div className="mt-auto" />
              <Reveal anim>
                <h1 className="display text-[2.5rem] leading-[1.04] tracking-[-0.035em] text-white sm:text-[3.5rem]">
                  Every blood test. One clear line.
                </h1>
                <p className="m-item mt-4 text-lg text-white/85" style={at(150)}>
                  Add your results. Watch each marker over time.
                </p>
                <div className="m-item mt-6 flex flex-wrap gap-3" style={at(300)}>
                  <Button asChild size="lg" variant="light">
                    <Link href="/login">Start free</Link>
                  </Button>
                  <Button asChild size="lg" variant="glass">
                    <Link href="/demo">See a sample</Link>
                  </Button>
                </div>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
                  {checks.map((t, i) => (
                    <li key={t} className="m-item inline-flex items-center gap-1.5" style={at(450 + i * 90)}>
                      <Check className="size-4" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </Art>

            {/* Desktop: words on one side, the painting and the product on the other */}
            <div className="hidden min-h-[min(780px,calc(100dvh-92px))] grid-cols-2 gap-4 lg:grid">
              <Reveal anim effect="none" className="card-wash flex flex-col rounded-[28px] p-12 xl:p-14">
                <p className="eyebrow m-item">Blood test tracker</p>
                <div className="mt-auto pt-16">
                  <h1 className="display m-item text-[clamp(2.75rem,0.8rem+3.4vw,4.5rem)] leading-[1.02] tracking-[-0.035em] text-ink" style={at(100)}>
                    Every blood test. <span className="text-grad">One clear line.</span>
                  </h1>
                  <p className="m-item mt-5 text-xl text-ink-2" style={at(250)}>
                    Add your results. Watch each marker over time.
                  </p>
                  <div className="m-item mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" style={at(400)}>
                    <Button asChild size="lg">
                      <Link href="/login">Start free</Link>
                    </Button>
                    <Link
                      href="/demo"
                      className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink underline decoration-line-strong underline-offset-[6px] transition-colors duration-300 hover:text-brand hover:decoration-brand"
                    >
                      See a sample <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </div>
                <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-line pt-7">
                  {[
                    { label: "markers", value: <CountUp value={BUILTIN_COUNT} delay={550} /> },
                    { label: "body systems", value: <CountUp value={CATEGORY_COMMON_ORDER.length} delay={650} /> },
                    { label: "to start", value: "$0" },
                  ].map(({ label, value }, i) => (
                    <div key={label} className="m-item flex flex-col-reverse" style={at(550 + i * 100)}>
                      <dt className="mt-1.5 text-sm text-ink-3">{label}</dt>
                      <dd className="text-[2rem] font-medium leading-none tracking-[-0.03em] text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>

              <Art name="hero" priority className="flex items-center justify-center p-10 xl:p-14">
                <Reveal anim className="w-full max-w-[27rem] space-y-4" delay={150}>
                  <StatusSummary digests={digests} className="glass" countUp />
                  <div className="m-item" style={at(350)}>
                    <MarkerCard
                      d={d("ldl-cholesterol")}
                      href="/demo/biomarkers/ldl-cholesterol"
                      className="glass h-auto"
                    />
                  </div>
                </Reveal>
                <p className="absolute inset-x-8 bottom-6 flex items-center justify-between text-sm text-white/85">
                  <span>Sample data</span>
                  <Link href="/demo" className="inline-flex items-center gap-1.5 font-medium text-white hover:underline">
                    Open it <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </p>
              </Art>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- HOW IT WORKS */}
        <section id="how" className={cn("scroll-mt-20", SECTION)}>
          <div className={WRAP}>
            <Reveal className="text-center">
              <h2 className={H2}>
                Add. See. <span className="text-ink-3">Follow.</span>
              </h2>
            </Reveal>

            <ol className="mt-10 grid gap-8 lg:grid-cols-3 lg:gap-5">
              <Step n="1" art="step1" title="Add a report" body="Type the numbers. Panels fill the rows.">
                <div className="glass-dark w-full max-w-[20rem] space-y-2 rounded-2xl p-3">
                  {(
                    [
                      ["Lipid panel", "5 results"],
                      ["Blood count", "9 results"],
                      ["Thyroid", "3 results"],
                    ] as const
                  ).map(([name, meta], i) => (
                    <div key={name} className="m-item flex items-center gap-3 rounded-xl bg-white/10 p-3" style={at(i * 280)}>
                      <ClipboardList className="size-4 shrink-0 opacity-80" />
                      <span className="flex-1 text-[0.9375rem] font-medium">{name}</span>
                      <span className="text-xs text-white/70">{meta}</span>
                      <span className="m-pop grid size-6 place-items-center rounded-full bg-white text-ink" style={at(i * 280 + 350)}>
                        <Check className="size-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              </Step>
              <Step n="2" art="step2" title="See where it sits" body="Every value against your lab's range." delay={100}>
                <div className="glass w-full max-w-[20rem] space-y-4 rounded-2xl p-4">
                  {[d("hdl-cholesterol"), d("hba1c"), d("vitamin-d")].map((m, i) => (
                    <div key={m.id} style={at(i * 220)}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-ink">
                          {m.name.replace(" (25-OH)", "").replace(" Cholesterol", "")}
                          <span className="ml-2 font-normal text-ink-3 tnum">
                            {m.valueLabel} {m.unit}
                          </span>
                        </p>
                        <span className="m-fade" style={at(i * 220 + 900)}>
                          <StatusBadge status={m.status} />
                        </span>
                      </div>
                      <RangeBar value={m.value!} min={m.rangeMin} max={m.rangeMax} status={m.status} className="mt-2.5" />
                    </div>
                  ))}
                </div>
              </Step>
              <Step n="3" art="step3" title="Follow the line" body="From the second test, a trend." delay={200}>
                <div className="glass w-full max-w-[20rem] rounded-2xl p-4">
                  <p className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink">LDL cholesterol</span>
                    <span className="text-xs text-ink-3">2019–2026</span>
                  </p>
                  <MiniTrend s={summary("ldl-cholesterol")} eventDate="2023-04-03" eventLabel="Started statin" />
                </div>
              </Step>
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------- TRENDS */}
        <section id="trends" className={cn("scroll-mt-20", SECTION)}>
          <div className={WRAP}>
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Trends</p>
              <h2 className={cn(H2, "mt-4")}>
                One marker. <span className="text-ink-3">Every year.</span>
              </h2>
            </Reveal>
            <Reveal anim effect="none" className="mt-6 flex flex-wrap justify-center gap-2">
              {["Your lab's range, shaded", "Life events on the line", "mg/dL ⇄ mmol/L"].map((t, i) => (
                <span key={t} className="m-item chip" style={at(i * 100)}>
                  {t}
                </span>
              ))}
            </Reveal>
            <Reveal anim delay={100} className="mx-auto mt-8 max-w-4xl">
              <Art name="cta" ribbed className="p-3 sm:p-6 lg:p-8">
                <div className="rounded-2xl shadow-[var(--shadow-float)]">
                  <MarkerShowcase markers={showcase} />
                </div>
              </Art>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------- READING RESULTS */}
        <section className={SECTION}>
          <div className={WRAP}>
            <Reveal className="text-center">
              <h2 className={H2}>
                Four states. <span className="text-ink-3">Plain words.</span>
              </h2>
            </Reveal>
            <Reveal anim effect="none" className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {(
                [
                  ["IN_RANGE", "In range", "Inside, with room.", "var(--in-range-soft)"],
                  ["BORDERLINE_HIGH", "Borderline", "Inside, near a limit.", "var(--borderline-soft)"],
                  ["HIGH", "High or low", "Outside. The arrow shows which way.", "var(--out-soft)"],
                  ["NO_RANGE", "No range", "Tracked, not judged.", "var(--paper-3)"],
                ] as [ResultStatus, string, string, string][]
              ).map(([status, title, body, tint], i) => (
                <div
                  key={status}
                  className="m-item card rounded-[20px] p-5 sm:p-6"
                  style={{ ...at(i * 120), background: `linear-gradient(168deg, ${tint} 0%, var(--paper) 58%)` }}
                >
                  <span className="m-pop grid size-11 place-items-center rounded-full bg-paper" style={at(i * 120 + 250)}>
                    <StatusGlyph status={status} size={18} />
                  </span>
                  <p className="mt-5 text-lg font-medium text-ink">{title}</p>
                  <p className="mt-1 text-[0.9375rem] text-ink-2">{body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- MARKERS */}
        <section id="markers" className={cn("scroll-mt-20", SECTION)}>
          <div className={WRAP}>
            <Reveal className="text-center">
              <h2 className={H2}>
                <CountUp value={BUILTIN_COUNT} /> markers.{" "}
                <span className="text-ink-3">Ten body systems.</span>
              </h2>
              <p className="mt-4 text-lg text-ink-2">Search by what your lab prints: A1c, LDL, TSH.</p>
            </Reveal>
            <Reveal anim effect="none" className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-3 lg:grid-cols-3">
              {systems.map(({ category, count }, i) => (
                <div key={category} className="m-item card rounded-[18px] px-4 py-3.5 sm:px-5 sm:py-4" style={at(i * 60)}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[0.9375rem] font-medium leading-snug text-ink">{CATEGORY_LABEL[category]}</h3>
                    <p className="text-sm text-ink-3 tnum">{count}</p>
                  </div>
                  <div className="mt-3 h-1 rounded-full bg-paper-3" aria-hidden>
                    <div
                      className="m-grow h-full rounded-full bg-ink-3"
                      style={{ ...at(i * 60 + 200), width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="m-item card-wash col-span-2 flex items-center gap-3 px-5 py-4" style={at(systems.length * 60)}>
                <Plus className="size-4 shrink-0 text-ink-2" aria-hidden />
                <p className="font-medium text-ink">
                  Missing one? <span className="font-normal text-ink-2">Add your own, with its unit and range.</span>
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------- REAL LIFE */}
        <section className={SECTION}>
          <div className={WRAP}>
            <Reveal className="text-center">
              <h2 className={H2}>
                For your doctor. <span className="text-ink-3">For your family.</span>
              </h2>
            </Reveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Reveal anim className="card m-lift flex flex-col rounded-[24px] p-6 sm:p-8">
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink">One page for the appointment</h3>
                <div className="card-wash mt-5 p-4" aria-hidden>
                  <p className="flex items-center gap-2 text-xs font-medium text-ink-3">
                    <FileText className="size-3.5" /> Flagged for discussion
                  </p>
                  <ul className="mt-2 divide-y divide-line">
                    {[d("fasting-glucose"), d("vitamin-d"), d("alt")].map((m, i) => (
                      <li key={m.id} className="m-item flex items-center justify-between gap-3 py-2.5" style={at(200 + i * 150)}>
                        <span className="truncate text-sm font-medium text-ink">{m.name.replace(" (25-OH)", "")}</span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="text-sm text-ink tnum">
                            {m.valueLabel} <span className="unit">{m.unit}</span>
                          </span>
                          <StatusBadge status={m.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-4 text-xs text-ink-3">Pro · prints as plain ink on paper</p>
              </Reveal>

              <Reveal anim delay={100} className="card m-lift flex flex-col rounded-[24px] p-6 sm:p-8">
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink">Everyone in one account</h3>
                <div className="card-wash mt-5 space-y-1 p-3" aria-hidden>
                  {(
                    [
                      ["Alex", "22 markers", true],
                      ["Mum", "31 markers", false],
                      ["Dad", "18 markers", false],
                    ] as const
                  ).map(([name, meta, active], i) => (
                    <div
                      key={name}
                      className={cn("m-item flex items-center gap-3 rounded-xl px-3 py-2.5", active && "bg-paper ring-1 ring-line-strong")}
                      style={at(200 + i * 150)}
                    >
                      <span
                        className={cn(
                          "m-pop grid size-8 place-items-center rounded-full text-xs font-medium",
                          active ? "bg-[image:var(--grad-brand)] text-white" : "bg-paper-3 text-ink-2",
                        )}
                        style={at(300 + i * 150)}
                      >
                        {name.charAt(0)}
                      </span>
                      <span className="text-sm font-medium text-ink">{name}</span>
                      <span className="ml-auto text-xs text-ink-3">{meta}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-ink-3">1 profile free · up to {PLAN_LIMITS.pro.maxProfiles} on Pro</p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- PRIVACY */}
        <section id="privacy" className="scroll-mt-20 py-8 sm:py-12">
          <div className={WRAP}>
            <Art name="deep" sizes="100vw" className="px-6 py-14 text-white sm:px-12 sm:py-20">
              <Reveal>
                <h2 className="display max-w-[18ch] text-[clamp(1.875rem,1.2rem+2.4vw,3rem)] text-white">
                  Your results. <span className="text-white/60">Only yours.</span>
                </h2>
              </Reveal>
              <Reveal anim effect="none" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    [Lock, "Private by default", "Locked to your account in the database."],
                    [ShieldCheck, "No trackers", "No ads. No analytics scripts."],
                    [Download, "Export, free", "CSV or JSON, any time."],
                    [Trash2, "Delete is delete", "Everything goes, sign-in too."],
                  ] as const
                ).map(([Icon, title, body], i) => (
                  <div key={title} className="m-item glass-dark rounded-[20px] p-5" style={at(i * 120)}>
                    <span className="m-pop grid size-10 place-items-center rounded-xl bg-white/12" style={at(i * 120 + 200)}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="mt-4 font-medium">{title}</h3>
                    <p className="mt-1 text-sm text-white/75">{body}</p>
                  </div>
                ))}
              </Reveal>
              <p className="mt-10 text-[0.9375rem] text-white/70">A record, not a diagnosis.</p>
            </Art>
          </div>
        </section>

        {/* --------------------------------------------------------- PRICING */}
        <section id="pricing" className={cn("scroll-mt-20", SECTION)}>
          <div className={WRAP}>
            <Reveal className="text-center">
              <h2 className={H2}>
                Free to track. <span className="text-ink-3">Pro for more.</span>
              </h2>
            </Reveal>
            <Reveal anim effect="none" className="mx-auto mt-10 grid max-w-4xl gap-5 lg:grid-cols-2">
              <div className="m-item flex" style={at(0)}>
                <PlanCard
                  name="Free"
                  price="$0"
                  note="No card."
                  cta="Start free"
                  features={[
                    "1 profile",
                    `${PLAN_LIMITS.free.maxSessions} tests`,
                    `All ${BUILTIN_COUNT} markers, plus your own`,
                    "Trends, ranges, units",
                    "Export",
                  ]}
                />
              </div>
              <div className="m-item flex" style={at(150)}>
                <PlanCard
                  name="Pro"
                  price="$4.99"
                  per="a month"
                  note="Or $39 a year. Cancel any time."
                  cta="Start free, upgrade later"
                  featured
                  features={[
                    `${PLAN_LIMITS.pro.maxProfiles} profiles`,
                    "Unlimited tests",
                    "Doctor summary",
                    "Everything in Free",
                  ]}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------- FAQ */}
        <section className={SECTION}>
          <div className={cn(WRAP, "max-w-3xl")}>
            <Reveal className="text-center">
              <h2 className={H2}>Questions</h2>
            </Reveal>
            <Reveal delay={80} className="card mt-8 rounded-[24px] px-6 sm:px-8">
              {FAQ.map(([q, a]) => (
                <details key={q} name="faq" className="acc border-t border-line first:border-t-0">
                  <summary className="flex items-center justify-between gap-6 py-5">
                    <span className="text-[1.0625rem] font-medium text-ink">{q}</span>
                    <Plus className="acc-mark size-5 shrink-0 text-ink-3" aria-hidden />
                  </summary>
                  <p className="pb-5 text-[0.9375rem] text-ink-2">{a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------- FINAL CTA */}
        <section className="pb-16 sm:pb-24">
          <div className={WRAP}>
            <Art name="cta" scrim sizes="100vw" className="px-6 py-20 text-center text-white sm:px-12 sm:py-28">
              <Reveal anim effect="none">
                <h2 className="display m-item mx-auto max-w-[16ch] text-[clamp(2rem,1.2rem+3.2vw,3.75rem)] text-white">
                  Start with the report you have.
                </h2>
                <div className="m-item mt-8 flex flex-wrap items-center justify-center gap-3" style={at(200)}>
                  <Button asChild size="lg" variant="light">
                    <Link href="/login">Start free</Link>
                  </Button>
                  <Button asChild size="lg" variant="glass">
                    <Link href="/demo">
                      See a sample <ArrowRight aria-hidden />
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
              <p className="mt-4 max-w-xs text-sm text-ink-2">Your blood tests, as trends.</p>
            </div>
            <nav className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Footer">
              {[...NAV_LINKS, ["Sample dashboard", "/demo"], ["Sign in", "/login"]].map(([label, href]) => (
                <a key={href} href={href} className="text-sm text-ink-2 transition-colors duration-300 hover:text-brand">
                  {label}
                </a>
              ))}
            </nav>
          </div>
          <p className="mt-10 max-w-2xl border-t border-line pt-6 text-xs leading-relaxed text-ink-3">{DISCLAIMER_TEXT}</p>
          <p className="mt-3 text-xs text-ink-3">© {new Date().getFullYear()} bbiom</p>
        </div>
      </footer>
    </div>
  );
}

const FAQ: [string, string][] = [
  ["Do I type my results in?", "Yes. Panel shortcuts fill the rows, and likely typos are flagged before saving."],
  ["Which range does it use?", "The one on your report first, then one you set, then the standard range."],
  ["My lab uses other units.", "Enter what your lab printed. bbiom converts."],
  ["Is this medical advice?", "No. It is a record. Talk your results through with your doctor."],
  ["What if I leave?", "Export everything for free, or delete it all."],
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
    <Reveal as="li" anim delay={delay} className="m-lift flex flex-col">
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
      <h3 className="mt-5 text-center text-xl font-medium tracking-[-0.01em] text-ink">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[26rem] text-center text-[0.9375rem] text-ink-2">{body}</p>
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
      <g className="m-fade" style={{ "--d": "700ms" } as React.CSSProperties}>
        <line x1={ex} x2={ex} y1={pad.t - 6} y2={H - pad.b} stroke="var(--chart-axis)" />
        <text x={ex + 5} y={pad.t - 9} fontSize={11} fill="var(--ink-2)">
          {eventLabel}
        </text>
      </g>
      <polyline
        className="m-draw"
        pathLength={1}
        style={{ "--d": "200ms" } as React.CSSProperties}
        points={pts.map((p) => `${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="var(--chart-line)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle
          key={p.resultId}
          className="m-pop"
          style={{ "--d": `${200 + Math.round((i / Math.max(1, pts.length - 1)) * 1000)}ms` } as React.CSSProperties}
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
    <Art name="deep" className="flex w-full flex-col p-7 text-white sm:p-9">
      {body}
    </Art>
  ) : (
    <div className="card flex w-full flex-col rounded-[28px] p-7 text-ink sm:p-9">{body}</div>
  );
}
