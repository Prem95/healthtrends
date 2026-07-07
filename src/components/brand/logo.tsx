import { cn } from "@/lib/utils";

/**
 * Wordmark: a small hand-drawn trend line inside a rounded square, paired with
 * the serif name. The line rises then settles — "trend, not snapshot".
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span className="grid size-8 place-items-center rounded-md bg-brand text-paper">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M3 16.5 8 11l3.5 3L21 5.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="11" r="1.4" fill="currentColor" />
          <circle cx="11.5" cy="14" r="1.4" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-lg tracking-tight text-ink">HealthTrends</span>
    </span>
  );
}
