import { cn } from "@/lib/utils";

/**
 * Wordmark: a tile in the brand gradient (evergreen into orange) holding one
 * plotted line that settles into range, beside the name.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex select-none items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-[image:var(--grad-brand)] text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M4 15.5 8.5 9l4 5 3-3.5H20"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="10.5" r="1.9" fill="currentColor" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[1.125rem] font-medium tracking-[-0.02em] text-ink">bbiom</span>
      )}
    </span>
  );
}
