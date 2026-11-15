import { MarkersView } from "@/components/views/markers-view";
import { getDemoData } from "@/lib/demo";
import { DEMO_CTX } from "@/lib/view-context";

export default function DemoMarkersPage() {
  const demo = getDemoData();
  return (
    <MarkersView
      ctx={DEMO_CTX}
      biomarkers={demo.biomarkers}
      summaries={demo.summaries}
      unitPrefs={{}}
    />
  );
}
