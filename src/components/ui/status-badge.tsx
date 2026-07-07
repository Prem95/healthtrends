import { cn } from "@/lib/utils";
import type { ResultStatus, TrendDirection } from "@/lib/domain";
import { STATUS_LABEL, statusTone } from "@/lib/domain";

/*
  Statuses are typeset like marks on a lab form: a small square swatch and
  plain text. No pills, no glow.
*/

const TONE_TEXT: Record<string, string> = {
  "in-range": "text-in-range",
  borderline: "text-borderline",
  out: "text-out",
  neutral: "text-ink-3",
};

const TONE_SWATCH: Record<string, string> = {
  "in-range": "bg-in-range",
  borderline: "bg-borderline",
  out: "bg-out",
  neutral: "bg-neutral-status",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ResultStatus;
  className?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        TONE_TEXT[tone],
        className,
      )}
    >
      <span className={cn("size-2 shrink-0", TONE_SWATCH[tone])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "in-range" | "borderline" | "out";
}) {
  const map: Record<string, string> = {
    neutral: "text-ink-2 border-line-strong",
    brand: "text-brand-strong border-brand/40",
    "in-range": "text-in-range border-in-range/40",
    borderline: "text-borderline border-borderline/40",
    out: "text-out border-out/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[0.6875rem] font-semibold tracking-wide uppercase",
        map[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const ARROW: Record<TrendDirection, string> = {
  RISING: "↑",
  FALLING: "↓",
  STABLE: "→",
  INSUFFICIENT_DATA: "·",
};

export function TrendArrow({ direction }: { direction: TrendDirection }) {
  return <span className="tnum tabular-nums">{ARROW[direction]}</span>;
}
