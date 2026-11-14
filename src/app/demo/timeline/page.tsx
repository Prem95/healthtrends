import { TimelineView } from "@/components/views/timeline-view";
import { getDemoData } from "@/lib/demo";
import { DEMO_CTX } from "@/lib/view-context";

export default function DemoTimelinePage() {
  const demo = getDemoData();
  return (
    <TimelineView
      ctx={DEMO_CTX}
      profile={demo.profile}
      sessions={demo.sessions}
      summaries={demo.summaries}
      events={demo.events}
      unitPrefs={{}}
    />
  );
}
