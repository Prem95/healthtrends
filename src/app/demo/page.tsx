import { OverviewView } from "@/components/views/overview-view";
import { getDemoData } from "@/lib/demo";
import { DEMO_CTX } from "@/lib/view-context";

export default function DemoOverviewPage() {
  const demo = getDemoData();
  return (
    <OverviewView
      ctx={DEMO_CTX}
      profile={demo.profile}
      summaries={demo.summaries}
      sessions={demo.sessions}
      watched={demo.watched}
      unitPrefs={{}}
    />
  );
}
