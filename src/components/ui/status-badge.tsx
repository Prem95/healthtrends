import { cn } from "@/lib/utils";
import type { ResultStatus, TrendDirection } from "@/lib/domain";
import { STATUS_LABEL, statusTone } from "@/lib/domain";

/*
  Status pills per the handoff: mono uppercase 10px, 5px radius, tinted fill
  with the status hue as text. Terse on the face ("Drifting"), full label on
  aria/title. Colour stays reserved for data.
*/

const TONE_PILL: Record<string, string> = {
  "in-range": "bg-in-range-soft text-in-range",
  borderline: "bg-borderline-soft text-borderline-ink",
  out: "bg-out-soft text-out",
  neutral: "bg-paper-3 text-ink-2",
};

const SHORT_LABEL: Record<ResultStatus, string> = {
  LOW: "Low",
  HIGH: "High",
  IN_RANGE: "In range",
  BORDERLINE_LOW: "Drifting",
  BORDERLINE_HIGH: "Drifting",
  NO_RANGE: "No range",
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
      className={cn("au-pill", TONE_PILL[tone], className)}
      title={STATUS_LABEL[status]}
      aria-label={STATUS_LABEL[status]}
    >
      {SHORT_LABEL[status]}
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
    neutral: "bg-paper-3 text-ink-2",
    brand: "bg-brand-soft text-brand",
    "in-range": "bg-in-range-soft text-in-range",
    borderline: "bg-borderline-soft text-borderline-ink",
    out: "bg-out-soft text-out",
  };
  return (
    <span className={cn("au-pill gap-1", map[tone], className)}>{children}</span>
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
