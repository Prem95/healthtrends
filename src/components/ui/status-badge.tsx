import { cn } from "@/lib/utils";
import type { ResultStatus, TrendDirection } from "@/lib/domain";
import { STATUS_LABEL, statusTone } from "@/lib/domain";

/*
  Status is never colour alone. Each state has its own shape — a dot for in
  range, a diamond for borderline, an arrow pointing the way a value has left
  its range — plus a plain-language label in ink.
*/

export type Tone = "in-range" | "borderline" | "out" | "neutral";

export const TONE_VAR: Record<Tone, string> = {
  "in-range": "var(--in-range)",
  borderline: "var(--borderline)",
  out: "var(--out)",
  neutral: "var(--neutral-status)",
};

const TONE_FILL: Record<Tone, string> = {
  "in-range": "bg-in-range-soft",
  borderline: "bg-borderline-soft",
  out: "bg-out-soft",
  neutral: "bg-paper-3",
};

export const SHORT_LABEL: Record<ResultStatus, string> = {
  LOW: "Low",
  HIGH: "High",
  IN_RANGE: "In range",
  BORDERLINE_LOW: "Borderline low",
  BORDERLINE_HIGH: "Borderline high",
  NO_RANGE: "No range",
};

/** The shape that stands for a status, drawn in its status colour. */
export function StatusGlyph({
  status,
  size = 10,
  className,
}: {
  status: ResultStatus;
  size?: number;
  className?: string;
}) {
  const fill = TONE_VAR[statusTone(status)];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {status === "IN_RANGE" && <circle cx="5" cy="5" r="4" fill={fill} />}
      {(status === "BORDERLINE_HIGH" || status === "BORDERLINE_LOW") && (
        <path d="M5 0.5 9.5 5 5 9.5 0.5 5Z" fill={fill} />
      )}
      {status === "HIGH" && <path d="M5 1 9.5 9H0.5Z" fill={fill} />}
      {status === "LOW" && <path d="M5 9 0.5 1h9Z" fill={fill} />}
      {status === "NO_RANGE" && (
        <circle cx="5" cy="5" r="3.25" fill="none" stroke={fill} strokeWidth="1.5" />
      )}
    </svg>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: ResultStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("chip", TONE_FILL[statusTone(status)], className)}
      title={STATUS_LABEL[status]}
    >
      <StatusGlyph status={status} />
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
    brand: "bg-brand-soft text-brand-strong",
    "in-range": "bg-in-range-soft text-ink",
    borderline: "bg-borderline-soft text-ink",
    out: "bg-out-soft text-ink",
  };
  return <span className={cn("chip chip--plain", map[tone], className)}>{children}</span>;
}

const ARROW: Record<TrendDirection, string> = {
  RISING: "↑",
  FALLING: "↓",
  STABLE: "→",
  INSUFFICIENT_DATA: "·",
};

export function TrendArrow({ direction }: { direction: TrendDirection }) {
  return <span aria-hidden>{ARROW[direction]}</span>;
}
