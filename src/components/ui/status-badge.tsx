import { cn } from "@/lib/utils";
import type { ResultStatus, TrendDirection } from "@/lib/domain";
import { STATUS_LABEL, statusTone } from "@/lib/domain";

const TONE_CLASS: Record<string, string> = {
  "in-range": "bg-in-range-soft text-in-range border-in-range/20",
  borderline: "bg-borderline-soft text-borderline border-borderline/25",
  out: "bg-out-soft text-out border-out/20",
  neutral: "bg-paper-3 text-ink-3 border-line",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
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
    neutral: "bg-paper-3 text-ink-2 border-line",
    brand: "bg-brand-soft text-brand-strong border-brand/20",
    ...TONE_CLASS,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
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
