import { cn } from "@/lib/utils";

/**
 * Wordmark: the name set in the display serif, after a small mark — a
 * reference band with one reading inside it, the product in one glyph.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex select-none items-center gap-2", className)}>
      <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden>
        <rect x="1" y="1" width="26" height="26" rx="8" fill="var(--ink)" />
        <rect x="5" y="11" width="18" height="7" rx="1.5" fill="var(--page-bg)" opacity="0.22" />
        <path
          d="M5 19.5 9.5 12l4.5 4 3.5-6.5L23 14"
          fill="none"
          stroke="var(--page-bg)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="23" cy="14" r="2" fill="var(--page-bg)" />
      </svg>
      {!compact && (
        <span className="font-display text-[1.5rem] leading-none tracking-[-0.03em] text-ink">bbiom</span>
      )}
    </span>
  );
}
