import { cn } from "@/lib/utils";

/**
 * Wordmark set like a stamp on a lab form: a square-ruled mark holding a
 * plotted line, next to the serif name and a small ascending-trend glyph.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span className="grid size-8 place-items-center rounded-sm border-2 border-ink bg-paper text-ink">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M4 16.5 9 11l3.5 3L20 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <rect x="7.7" y="9.7" width="2.6" height="2.6" fill="currentColor" />
          <rect x="11.2" y="12.7" width="2.6" height="2.6" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-lg tracking-tight text-ink">
        bbiom
      </span>
    </span>
  );
}
