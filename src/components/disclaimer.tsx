// Exact text required by product PRD §6.4. Persistent, non-dismissable.
export const DISCLAIMER_TEXT =
  "This app tracks values you enter; it does not provide medical advice. Reference ranges vary by lab and individual. Discuss results with your healthcare provider.";

export function Disclaimer({ variant = "footer" }: { variant?: "footer" | "inline" }) {
  if (variant === "inline") {
    return (
      <p className="card-inset px-3.5 py-3 text-xs leading-relaxed text-ink-3">
        {DISCLAIMER_TEXT}
      </p>
    );
  }
  return (
    <footer className="border-t border-line">
      <p className="mx-auto max-w-5xl px-5 py-4 text-xs leading-relaxed text-ink-3 sm:px-8">
        {DISCLAIMER_TEXT}
      </p>
    </footer>
  );
}
