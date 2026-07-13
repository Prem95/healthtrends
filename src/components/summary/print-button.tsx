"use client";

import { Button } from "@/components/ui/button";

/* The one solid-accent CTA on this screen: it IS the point of the page. */
export function PrintButton() {
  return (
    <Button variant="accent" size="md" onClick={() => window.print()}>
      <span>Print / save as PDF</span>
      <span aria-hidden>→</span>
    </Button>
  );
}
