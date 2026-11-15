import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { DEMO_PROFILE } from "@/lib/demo";
import { DEMO_CTX } from "@/lib/view-context";

export const metadata: Metadata = {
  title: "Sample dashboard | bbiom",
  description:
    "Look around a bbiom dashboard filled with eight years of invented blood test results. No account needed.",
};

/*
  The public sample dashboard: the real product screens, read-only, over an
  invented profile. No auth, no database — everything comes from lib/demo.
*/
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell ctx={DEMO_CTX} profiles={[DEMO_PROFILE]} activeId={DEMO_PROFILE.id}>
      {children}
    </AppShell>
  );
}
