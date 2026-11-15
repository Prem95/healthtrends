import Link from "next/link";
import { Download, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { BUILTIN_BIOMARKERS, BUILTIN_COUNT } from "@/lib/catalog";
import { getDemoData } from "@/lib/demo";
import { toDigest } from "@/lib/digest";
import { CATEGORY_COMMON_ORDER } from "@/lib/commonality";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { formatMeasured } from "@/lib/domain";
import { cn, formatDate, prettyUnit } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MarkerCard } from "@/components/markers/marker-parts";
import { Reveal } from "@/components/motion/reveal";
import { Container, GRID, Section, SectionHeader } from "@/components/site/layout";
import { CtaBand, Faq, Feature, Pricing, Quote, StatRow, TextLink, at } from "@/components/site/blocks";
import { MarkerShowcase, type ShowcaseMarker } from "@/components/site/marker-showcase";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";
import { InRangeRing } from "@/components/site/visuals/in-range-ring";
import { LabPanel } from "@/components/site/visuals/lab-panel";
import { MarkerIndex, ProfileList, SummarySheet } from "@/components/site/visuals/record-visuals";
import { TrendPanorama } from "@/components/site/visuals/trend-panorama";

/*
  The marketing page. It sells the product by showing it: every picture
  below is the app's own components (or a chart drawn from the same data)
  over the sample profile in lib/demo, and that profile is one click away
  at /demo. Copy states only what the product does today.
*/

export default function Home() {
  const demo = getDemoData();
  const digests = demo.summaries.filter((s) => s.latest).map((s) => toDigest(s, {}));
  const byId = new Map(digests.map((d) => [d.id, d]));
  const d = (id: string) => byId.get(id)!;
  const summary = (id: string) => demo.summaries.find((s) => s.biomarker.id === id)!;
  const latestDate = demo.sessions[0].date;

  // Hero: LDL's whole history.
  const ldl = summary("ldl-cholesterol");
  const ldlNow = d("ldl-cholesterol");
  const ldlPeak = Math.max(...ldl.points.map((p) => p.value));
  const ldlUnit = prettyUnit(ldl.biomarker.canonicalUnit);
  const statin = demo.events.filter((e) => e.label === "Started statin");

  // The quote's evidence: glucose drifting up, test by test.
  const glucose = summary("fasting-glucose");
  const gUnit = prettyUnit(glucose.biomarker.canonicalUnit);
  const gFirst = glucose.points[0];
  const gLast = glucose.points[glucose.points.length - 1];

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

  const index = CATEGORY_COMMON_ORDER.map((category) => ({
    category,
    names: BUILTIN_BIOMARKERS.filter((b) => b.category === category).map((b) => b.name),
  })).filter((g) => g.names.length > 0);

  return (
    <div id="top" className="flex min-h-[100dvh] flex-col text-ink">
      <SiteNav />

      <main className="flex-1">
        {/* ------------------------------------------------------------ HERO */}
        <section aria-labelledby="hero-title" className="overflow-x-clip">
          <Container className="pb-10 pt-12 sm:pb-12 sm:pt-14 lg:pb-14 lg:pt-14">
            {/* Static on purpose: the headline is the first paint. */}
            <div className={cn(GRID, "items-end gap-y-8")}>
              <div className="lg:col-span-8">
                <p className="eyebrow">Blood test tracker</p>
                <h1 id="hero-title" className="display mt-6 text-display-xl text-ink">
                  Every blood test, <em className="text-brand">on one line.</em>
                </h1>
              </div>
              <div className="lg:col-span-4 lg:col-start-9 lg:pb-2">
                <p className="max-w-[34rem] text-lede text-ink-2">
                  Type in your lab results. See each marker against your lab&rsquo;s own range, year after year.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                  <Button asChild size="lg">
                    <Link href="/login">Start free</Link>
                  </Button>
                  <TextLink href="/demo">See a sample</TextLink>
                </div>
              </div>
            </div>
          </Container>

          {/* The image: the whole history, edge to edge, on white */}
          <div className="border-y border-line bg-paper">
            <Container className="relative pb-12 pt-8 sm:pb-14 lg:pt-10">
              <Reveal anim immediate effect="none">
                {/* The reading the line ends on: above the chart on small
                    screens, in the chart's empty top-right corner on wide ones */}
                <div
                  className="m-item mb-10 max-w-sm bg-paper lg:absolute lg:right-[var(--gutter)] lg:top-10 lg:z-10 lg:mb-0 lg:w-[17.5rem] lg:pb-4 lg:pl-6"
                  style={at(600)}
                >
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">LDL cholesterol</span>
                    <span className="text-ink-3">{formatDate(latestDate)}</span>
                  </p>
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className="figure text-[4rem] text-ink">{ldlNow.valueLabel}</span>
                    <span className="unit text-base">{ldlUnit}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <StatusBadge status={ldlNow.status} />
                    <span className="text-sm text-ink-2 tnum">
                      ↓ {formatMeasured(ldlPeak - (ldlNow.value ?? 0))} since the 2023 peak
                    </span>
                  </div>
                </div>
                <TrendPanorama
                  points={ldl.points.map((p) => ({ date: p.date, value: p.value, status: p.status }))}
                  band={ldl.bandRange}
                  bandLabel={`Your lab's range · under ${ldl.bandRange?.max} ${ldlUnit}`}
                  events={statin}
                  unit={ldlUnit}
                  label={`LDL cholesterol over ${ldl.points.length} tests from 2019 to 2026: ${formatMeasured(ldl.points[0].value)} ${ldlUnit} at first, a peak of ${formatMeasured(ldlPeak)} in 2023, then ${ldlNow.valueLabel} after starting a statin. The lab's range is under ${ldl.bandRange?.max}.`}
                />
              </Reveal>
              <div className="mt-14 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 text-sm text-ink-3">
                <p>Sample profile · LDL cholesterol · {ldl.points.length} tests, 2019–2026</p>
                <TextLink href="/demo/biomarkers/ldl-cholesterol" className="text-sm">
                  Open this chart
                </TextLink>
              </div>
            </Container>
          </div>
        </section>

        {/* ----------------------------------------------------------- FACTS */}
        <Section className="!pb-0" aria-labelledby="facts-title">
          <Container>
            <h2 id="facts-title" className="sr-only">
              At a glance
            </h2>
            <StatRow
              items={[
                { value: BUILTIN_COUNT, label: "Markers", note: "Plus any you add" },
                { value: CATEGORY_COMMON_ORDER.length, label: "Body systems", note: "Lipids to hormones" },
                { value: PLAN_LIMITS.pro.maxProfiles, label: "Profiles", note: "For the family, on Pro" },
                { value: "$0", label: "To start", note: "No card" },
              ]}
            />
          </Container>
        </Section>

        {/* -------------------------------------------------------- OVERVIEW */}
        <Section id="how" aria-labelledby="how-title">
          <Container>
            <Feature
              id="how-title"
              kicker="Overview"
              title={
                <>
                  How am I doing? <em>Answered first.</em>
                </>
              }
              body="One figure for your latest test. Then only what needs a closer look."
              points={[
                { title: "Your count, in range", body: "How many markers sit inside your lab's range today." },
                { title: "What moved", body: "Each flagged marker with its reading, range and last change." },
                { title: "Everything else, folded", body: "Grouped by body system, one tap away." },
              ]}
              visual={
                <div className="panel p-5 sm:p-7">
                  <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
                    <p className="text-[0.9375rem] font-medium text-ink">Overview</p>
                    <p className="text-xs text-ink-3">
                      {demo.profile.name} · last test {formatDate(latestDate)}
                    </p>
                  </div>
                  <InRangeRing digests={digests} className="mt-6" />
                  <p className="mt-8 text-xs font-medium text-ink-3">Worth a closer look</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[d("fasting-glucose"), d("vitamin-d")].map((m, i) => (
                      <div key={m.id} className="m-item" style={at(500 + i * 140)}>
                        <MarkerCard d={m} href={`/demo/biomarkers/${m.id}`} />
                      </div>
                    ))}
                  </div>
                </div>
              }
            />
          </Container>
        </Section>

        {/* ---------------------------------------------------------- RANGES */}
        <Section tone="white" aria-labelledby="ranges-title">
          <Container>
            <Feature
              reverse
              id="ranges-title"
              kicker="Ranges"
              title={
                <>
                  Your lab&rsquo;s range, <em>not a textbook one.</em>
                </>
              }
              body="Each result is read against the range printed on your report. No range on it? The standard one, or your own."
              points={[
                { title: "In range or borderline", body: "Inside the range, or inside but near a limit." },
                { title: "High or low", body: "Outside it. The arrow shows which way." },
                { title: "No range", body: "Tracked, never judged." },
              ]}
              visual={
                <LabPanel
                  title="Latest results"
                  meta={`Sample profile · ${formatDate(latestDate)}`}
                  rows={["ldl-cholesterol", "hdl-cholesterol", "hba1c", "fasting-glucose", "vitamin-d", "tsh"].map(d)}
                />
              }
            />
          </Container>
        </Section>

        {/* ---------------------------------------------------------- TRENDS */}
        <Section id="trends" tone="ink" aria-labelledby="trends-title">
          <Container>
            <Reveal>
              <SectionHeader
                id="trends-title"
                kicker="Trends"
                title={
                  <>
                    One marker. <em>Every year.</em>
                  </>
                }
                lede="Point at any test to read it. Life events sit on the line, so you can see what moved it."
              />
            </Reveal>
            <Reveal anim delay={100} className="mt-14">
              <MarkerShowcase markers={showcase} />
            </Reveal>
          </Container>
        </Section>

        {/* ----------------------------------------------------------- QUOTE */}
        <Section aria-label="What a trend shows">
          <Container>
            <Quote
              quote={
                <>
                  Each result looked fine. <em>Together, a steady drift.</em>
                </>
              }
              source="Fasting glucose, sample profile"
              meta={`${formatMeasured(gFirst.value)} to ${formatMeasured(gLast.value)} ${gUnit} across ${glucose.points.length} tests`}
              aside={
                <div className="panel px-5 pb-12 pt-6">
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">Fasting glucose</span>
                    <span className="text-ink-3">2019–2026</span>
                  </p>
                  <TrendPanorama
                    className="mt-8 h-[180px] sm:h-[200px] lg:h-[200px]"
                    points={glucose.points.map((p) => ({ date: p.date, value: p.value, status: p.status }))}
                    band={glucose.bandRange}
                    unit={gUnit}
                    label={`Fasting glucose rising from ${formatMeasured(gFirst.value)} to ${formatMeasured(gLast.value)} ${gUnit} over ${glucose.points.length} tests.`}
                  />
                </div>
              }
            />
          </Container>
        </Section>

        {/* --------------------------------------------------- DOCTOR, FAMILY */}
        <Section tone="white" aria-labelledby="share-title">
          <Container>
            <Reveal>
              <SectionHeader
                id="share-title"
                kicker="Share"
                title={
                  <>
                    For the appointment. <em>For the family.</em>
                  </>
                }
                lede="A one-page summary to hand your doctor, and a profile for everyone you look after."
              />
            </Reveal>
            <div className={cn(GRID, "mt-16 items-start")}>
              <Reveal anim className="rounded-[var(--r-panel)] bg-page px-5 py-10 sm:px-10 sm:py-14 lg:col-span-7">
                <SummarySheet
                  name={demo.profile.name}
                  date={latestDate}
                  flagged={[d("ldl-cholesterol"), d("fasting-glucose"), d("vitamin-d"), d("alt")]}
                />
                <p className="mx-auto mt-8 max-w-[30rem] text-sm text-ink-2">
                  <span className="font-medium text-ink">Doctor summary.</span> What is out of range, what is
                  borderline, and how each has moved. Pro.
                </p>
              </Reveal>
              <Reveal anim delay={120} className="lg:col-span-5">
                <ProfileList
                  people={[
                    { name: demo.profile.name, meta: `${digests.length} markers · last test Sep 2026`, status: "BORDERLINE_HIGH", note: "LDL" },
                    { name: "Mum", meta: "31 markers · last test Jun 2026", status: "IN_RANGE", note: "All in range" },
                    { name: "Dad", meta: "18 markers · last test Mar 2026", status: "HIGH", note: "HbA1c" },
                  ]}
                />
                <p className="mt-6 text-sm text-ink-2">
                  <span className="font-medium text-ink">Profiles.</span> Each person keeps their own record,
                  ranges and sex-specific limits. One free, up to {PLAN_LIMITS.pro.maxProfiles} on Pro.
                </p>
              </Reveal>
            </div>
          </Container>
        </Section>

        {/* --------------------------------------------------------- MARKERS */}
        <Section id="markers" aria-labelledby="markers-title">
          <Container>
            <Reveal>
              <SectionHeader
                id="markers-title"
                kicker="Catalog"
                title={
                  <>
                    {BUILTIN_COUNT} markers, <em>ten body systems.</em>
                  </>
                }
                lede="Search by what your lab prints: A1c, LDL, TSH. Missing one? Add your own, with its unit and range."
              />
            </Reveal>
            <Reveal delay={100} className="mt-16">
              <MarkerIndex groups={index} />
            </Reveal>
          </Container>
        </Section>

        {/* --------------------------------------------------------- PRIVACY */}
        <Section id="privacy" tone="white" aria-labelledby="privacy-title">
          <Container className={GRID}>
            <Reveal className="lg:col-span-5">
              <p className="eyebrow">Privacy</p>
              <h2 id="privacy-title" className="display mt-5 text-display-l text-ink">
                Your results. <em>Only yours.</em>
              </h2>
              <p className="mt-6 max-w-[26rem] text-lede text-ink-2">
                A record, not a diagnosis. Nothing is sold, shared or scored.
              </p>
            </Reveal>
            <Reveal anim effect="none" className="lg:col-span-6 lg:col-start-7">
              <ul className="border-t border-line-strong">
                {(
                  [
                    [Lock, "Private by default", "Every row is locked to your account in the database itself."],
                    [ShieldCheck, "No trackers", "No ads and no analytics scripts on any page."],
                    [Download, "Export, free", "Everything as CSV or JSON, any time, on any plan."],
                    [Trash2, "Delete is delete", "One action removes every result, profile and your sign-in."],
                  ] as const
                ).map(([Icon, title, body], i) => (
                  <li
                    key={title}
                    className="m-item grid grid-cols-[2.75rem_minmax(0,1fr)] border-b border-line py-6"
                    style={at(i * 110)}
                  >
                    <Icon className="mt-0.5 size-5 text-ink" aria-hidden />
                    <span>
                      <span className="block text-[1.0625rem] font-medium text-ink">{title}</span>
                      <span className="mt-1 block text-[0.9375rem] text-ink-2">{body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </Container>
        </Section>

        {/* --------------------------------------------------------- PRICING */}
        <Section id="pricing" aria-labelledby="pricing-title">
          <Container>
            <Reveal>
              <SectionHeader
                id="pricing-title"
                kicker="Pricing"
                title={
                  <>
                    Free to track. <em>Pro for more.</em>
                  </>
                }
                lede="Pro adds the family, unlimited tests and the doctor summary. Cancel any time."
              />
            </Reveal>
            <Pricing
              className="mt-16"
              plans={[
                {
                  name: "Free",
                  price: "$0",
                  note: "One person, no card.",
                  cta: { label: "Start free", href: "/login" },
                  features: [
                    "1 profile",
                    `${PLAN_LIMITS.free.maxSessions} tests`,
                    `All ${BUILTIN_COUNT} markers, plus your own`,
                    "Trends, ranges and unit conversion",
                    "Export any time",
                  ],
                },
                {
                  name: "Pro",
                  price: "$4.99",
                  per: "a month",
                  note: "Or $39 a year.",
                  cta: { label: "Start free, upgrade later", href: "/login" },
                  featured: true,
                  features: [
                    `${PLAN_LIMITS.pro.maxProfiles} profiles`,
                    "Unlimited tests",
                    "Doctor summary",
                    "Everything in Free",
                  ],
                },
              ]}
            />
          </Container>
        </Section>

        {/* ------------------------------------------------------------- FAQ */}
        <Section tone="white" aria-labelledby="faq-title">
          <Container>
            <Faq
              id="faq-title"
              title="Questions"
              aside={
                <p>
                  Still unsure? <TextLink href="/demo">Try the sample</TextLink>
                </p>
              }
              items={FAQ}
            />
          </Container>
        </Section>

        <CtaBand
          title="Start with the report you have."
          action={{ label: "Start free", href: "/login" }}
          secondary={{ label: "See a sample", href: "/demo" }}
          note="Free for one profile. No card."
        />
      </main>

      <SiteFooter />
    </div>
  );
}

const FAQ: [string, string][] = [
  ["Do I type my results in?", "Yes. Panel shortcuts fill the rows for common reports, and likely typos are flagged before you save."],
  ["Which range does it use?", "The one printed on your report first, then one you set, then the standard range for the marker."],
  ["My lab uses other units.", "Enter what your lab printed. bbiom converts between units such as mg/dL and mmol/L."],
  ["Is this medical advice?", "No. It is a record of the numbers you enter. Talk your results through with your doctor."],
  ["What if I leave?", "Export everything for free, or delete it all, including your sign-in."],
];
