import { cn } from "@/lib/utils";
import type { ResultStatus, TrendDirection } from "@/lib/domain";
import { STATUS_LABEL, statusTone } from "@/lib/domain";

/*
  Statuses read like the landing's "Out of range" mark: a soft tinted pill
  with the deepened status hue as text. Colour stays reserved for data.
*/

const TONE_PILL: Record<string, string> = {
  "in-range": "bg-in-range-soft text-in-range",
  borderline: "bg-borderline-soft text-borderline-ink",
  out: "bg-out-soft text-out",
  neutral: "bg-paper-3 text-ink-2",
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
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_PILL[tone],
        className,
      )}
    >
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
    neutral: "bg-paper-2 text-ink-2",
    brand: "bg-brand-soft text-brand-strong",
    "in-range": "bg-in-range-soft text-in-range",
    borderline: "bg-borderline-soft text-borderline-ink",
    out: "bg-out-soft text-out",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
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
