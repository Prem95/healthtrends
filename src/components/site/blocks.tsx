import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { GRID } from "@/components/site/layout";

/*
  The marketing site's building blocks. Each is a section-sized pattern with
  one job; the landing page composes them. Server components throughout —
  the only client code is the reveal and the count-up.
*/

type Vars = React.CSSProperties & Record<`--${string}`, string>;
export const at = (ms: number): Vars => ({ "--d": `${ms}ms` });

/* ------------------------------------------------------------- stat row */

export type StatItem = {
  /** A number counts up once in view; a string is printed as is. */
  value: number | string;
  prefix?: string;
  suffix?: string;
  label: string;
  note?: string;
};

/** A row of figures divided by hairline rules: the serif's big numerals. */
export function StatRow({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <Reveal anim effect="none" className={className}>
      <dl className="grid grid-cols-2 border-t border-line-strong lg:grid-cols-4">
        {items.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "m-item flex flex-col-reverse justify-end gap-3 border-line py-7 pr-4 lg:py-9 lg:pl-7",
              i % 2 === 1 && "border-l pl-5",
              i >= 2 && "border-t lg:border-t-0",
              i > 0 && "lg:border-l",
              i === 0 && "lg:pl-0",
            )}
            style={at(i * 110)}
          >
            <dt>
              <span className="block text-[0.9375rem] font-medium text-ink">{s.label}</span>
              {s.note && <span className="mt-1 block text-sm text-ink-3">{s.note}</span>}
            </dt>
            <dd className="figure text-[clamp(3rem,2rem+3vw,4.75rem)] text-ink">
              {s.prefix}
              {typeof s.value === "number" ? <CountUp value={s.value} delay={i * 110} /> : s.value}
              {s.suffix && <span className="text-ink-3">{s.suffix}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Reveal>
  );
}

/* -------------------------------------------------------------- feature */

/**
 * A feature told in two unequal columns: the words in five, the product in
 * seven (or the reverse). `points` are short numbered lines under the copy.
 */
export function Feature({
  id,
  kicker,
  title,
  body,
  points,
  visual,
  reverse = false,
  className,
}: {
  id?: string;
  kicker: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  points?: { title: string; body: string }[];
  visual: React.ReactNode;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(GRID, "items-center gap-y-14", className)}>
      <Reveal className={cn("lg:col-span-5", reverse ? "lg:col-start-8 lg:row-start-1" : "lg:col-start-1")}>
        <p className="eyebrow">{kicker}</p>
        <h2 id={id} className="display mt-5 text-display-m text-ink">
          {title}
        </h2>
        {body && <p className="mt-5 max-w-[30rem] text-lede text-ink-2">{body}</p>}
        {points && (
          <ol className="mt-9 max-w-[30rem] border-t border-line-strong">
            {points.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 border-b border-line py-4">
                <span className="pt-0.5 text-xs text-ink-3 tnum">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-[0.9375rem] font-medium text-ink">{p.title}</span>
                  <span className="mt-0.5 block text-[0.9375rem] text-ink-2">{p.body}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Reveal>
      <Reveal
        anim
        delay={120}
        className={cn("lg:col-span-7", reverse ? "lg:col-start-1 lg:row-start-1" : "lg:col-start-6")}
      >
        {visual}
      </Reveal>
    </div>
  );
}

/* ---------------------------------------------------------- testimonial */

/**
 * A pull quote with its source and, optionally, the evidence beside it.
 * Only for words someone actually said or data that actually shows it:
 * `source` names who, `meta` says what it is.
 */
export function Quote({
  quote,
  source,
  meta,
  aside,
  className,
}: {
  quote: React.ReactNode;
  source: string;
  meta?: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn(GRID, "items-end gap-y-10", className)}>
      <Reveal className="lg:col-span-8">
        <span className="figure block text-[5rem] leading-[0.6] text-brand" aria-hidden>
          &ldquo;
        </span>
        <blockquote className="display mt-4 text-display-l text-ink">{quote}</blockquote>
        <figcaption className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[0.9375rem] font-medium text-ink">{source}</span>
          {meta && <span className="text-sm text-ink-3">{meta}</span>}
        </figcaption>
      </Reveal>
      {aside && (
        <Reveal anim delay={150} className="lg:col-span-4">
          {aside}
        </Reveal>
      )}
    </figure>
  );
}

/* -------------------------------------------------------------- pricing */

export type Plan = {
  name: string;
  price: string;
  per?: string;
  note: string;
  cta: { label: string; href: string };
  features: string[];
  featured?: boolean;
};

/** Plans side by side; the featured one is set in ink. */
export function Pricing({ plans, className }: { plans: Plan[]; className?: string }) {
  return (
    <Reveal anim effect="none" className={cn("grid gap-4 md:grid-cols-2", className)}>
      {plans.map((p, i) => (
        <div
          key={p.name}
          data-theme={p.featured ? "dark" : undefined}
          className={cn(
            "m-item flex flex-col rounded-[var(--r-panel)] p-7 sm:p-9",
            p.featured ? "bg-page text-ink" : "border border-line-strong bg-paper text-ink",
          )}
          style={at(i * 140)}
        >
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-[0.9375rem] font-medium">{p.name}</h3>
            {p.featured && <span className="text-xs text-ink-3">For families and frequent tests</span>}
          </div>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="figure text-[4.25rem]">{p.price}</span>
            {p.per && <span className="text-ink-3">{p.per}</span>}
          </p>
          <p className="mt-3 text-sm text-ink-3">{p.note}</p>
          <ul className="mt-7 flex-1 space-y-3 border-t border-line pt-7">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[0.9375rem] text-ink-2">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant={p.featured ? "light" : "secondary"} className="mt-9 w-full">
            <Link href={p.cta.href}>{p.cta.label}</Link>
          </Button>
        </div>
      ))}
    </Reveal>
  );
}

/* ------------------------------------------------------------------ faq */

/** Questions: the heading holds the left columns, answers fold on the right. */
export function Faq({
  title,
  id,
  items,
  aside,
}: {
  title: React.ReactNode;
  id?: string;
  items: [string, string][];
  aside?: React.ReactNode;
}) {
  return (
    <div className={GRID}>
      <Reveal className="lg:col-span-4">
        <h2 id={id} className="display text-display-m text-ink">
          {title}
        </h2>
        {aside && <div className="mt-5 text-[0.9375rem] text-ink-2">{aside}</div>}
      </Reveal>
      <Reveal delay={100} className="border-t border-line-strong lg:col-span-7 lg:col-start-6">
        {items.map(([q, a]) => (
          <details key={q} name="faq" className="acc border-b border-line">
            <summary className="flex items-center justify-between gap-6 py-6">
              <span className="text-[1.0625rem] font-medium text-ink">{q}</span>
              <Plus className="acc-mark size-5 shrink-0 text-ink-3" aria-hidden />
            </summary>
            <p className="max-w-[36rem] pb-6 text-[0.9375rem] leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </Reveal>
    </div>
  );
}

/* ------------------------------------------------------------- CTA band */

/** The closing band: cobalt, full bleed, one claim and one action. */
export function CtaBand({
  title,
  action,
  secondary,
  note,
}: {
  title: React.ReactNode;
  action: { label: string; href: string };
  secondary?: { label: string; href: string };
  note?: string;
}) {
  return (
    <section className="bg-brand text-white" aria-label="Get started">
      <div className="mx-auto w-full max-w-[1360px] px-[var(--gutter)] py-[var(--space-section)]">
        <Reveal anim effect="none" className={cn(GRID, "items-end")}>
          <h2 className="display m-item text-display-l text-white lg:col-span-8">{title}</h2>
          <div className="m-item flex flex-col items-start gap-4 lg:col-span-4 lg:items-end" style={at(150)}>
            <Button asChild size="lg" variant="light">
              <Link href={action.href}>{action.label}</Link>
            </Button>
            {secondary && (
              <Link
                href={secondary.href}
                className="inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-white underline decoration-white/40 underline-offset-[6px] transition-colors duration-300 hover:decoration-white"
              >
                {secondary.label} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
            {note && <p className="text-sm text-white/75">{note}</p>}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- inline link CTA */

/** The quiet second action beside a primary button. */
export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-ink underline decoration-line-strong underline-offset-[6px] transition-colors duration-300 hover:text-brand hover:decoration-brand",
        className,
      )}
    >
      {children} <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}
