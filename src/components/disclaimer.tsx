import { Info } from "lucide-react";

// Exact text required by product PRD §6.4. Persistent, non-dismissable.
export const DISCLAIMER_TEXT =
  "This app tracks values you enter; it does not provide medical advice. Reference ranges vary by lab and individual. Discuss results with your healthcare provider.";

export function Disclaimer({ variant = "footer" }: { variant?: "footer" | "inline" }) {
  if (variant === "inline") {
    return (
      <p className="flex items-start gap-2 rounded-md border border-line bg-paper-2 px-3 py-2 text-xs leading-relaxed text-ink-3">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {DISCLAIMER_TEXT}
      </p>
    );
  }
  return (
    <footer className="border-t border-line bg-paper-2">
      <p className="mx-auto max-w-6xl px-6 py-4 text-xs leading-relaxed text-ink-3">
        {DISCLAIMER_TEXT}
      </p>
    </footer>
  );
}
