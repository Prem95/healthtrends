import { cn } from "@/lib/utils";

/*
  Layout primitives for the marketing site. One container width, one
  12-column grid, one section rhythm (--space-section). Sections come in
  three tones: the paper canvas, white (charts and tables live on white) and
  ink (data-theme="dark" flips every token inside it).
*/

export const CONTAINER = "mx-auto w-full max-w-[1360px] px-[var(--gutter)]";

/** The 12-column editorial grid. Children place themselves with col-span. */
export const GRID = "grid grid-cols-1 gap-x-[var(--gutter)] gap-y-12 lg:grid-cols-12";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn(CONTAINER, className)}>{children}</div>;
}

export type Tone = "paper" | "white" | "ink";

export function Section({
  id,
  tone = "paper",
  flush = false,
  className,
  children,
  "aria-labelledby": labelledBy,
}: {
  id?: string;
  tone?: Tone;
  /** Drop the vertical rhythm (the caller pads). */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-theme={tone === "ink" ? "dark" : undefined}
      className={cn(
        "relative scroll-mt-16",
        !flush && "py-[var(--space-section)]",
        tone === "white" && "border-y border-line bg-paper",
        tone === "ink" && "bg-page text-ink",
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * A section opener. `split` sets the title across the left seven columns
 * and the lede in the right four, bottom-aligned — the editorial default.
 * `stack` keeps them together for narrow columns.
 */
export function SectionHeader({
  kicker,
  title,
  lede,
  id,
  layout = "split",
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  id?: string;
  layout?: "split" | "stack";
  className?: string;
}) {
  const heading = (
    <div>
      {kicker && <p className="eyebrow">{kicker}</p>}
      <h2 id={id} className={cn("display text-display-l text-ink", kicker && "mt-5")}>
        {title}
      </h2>
    </div>
  );
  if (layout === "stack" || !lede) {
    return (
      <div className={cn("max-w-[44rem]", className)}>
        {heading}
        {lede && <p className="mt-6 max-w-[34rem] text-lede text-ink-2">{lede}</p>}
      </div>
    );
  }
  return (
    <div className={cn(GRID, "items-end gap-y-6", className)}>
      <div className="lg:col-span-7">{heading}</div>
      <p className="max-w-[30rem] text-lede text-ink-2 lg:col-span-4 lg:col-start-9">{lede}</p>
    </div>
  );
}
