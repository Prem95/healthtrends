"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/* The primary action of the summary screen: it is the point of the page. */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Printer aria-hidden /> Print or save as PDF
    </Button>
  );
}
