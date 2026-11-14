import { Suspense } from "react";
import type { BiomarkerSummary } from "@/lib/analytics";
import { toDigest } from "@/lib/digest";
import type { Biomarker } from "@/lib/domain";
import type { ViewCtx } from "@/lib/view-context";
import { BiomarkerBrowser } from "@/components/biomarkers/biomarker-browser";

export function MarkersView({
  ctx,
  biomarkers,
  summaries,
  unitPrefs,
}: {
  ctx: ViewCtx;
  biomarkers: (Biomarker & { archived: boolean })[];
  summaries: BiomarkerSummary[];
  unitPrefs: Record<string, string>;
}) {
  const digests = Object.fromEntries(
    summaries.filter((s) => s.latest).map((s) => [s.biomarker.id, toDigest(s, unitPrefs)]),
  );
  return (
    <div>
      <h1 className="display text-[1.75rem] text-ink sm:text-[2rem]">Markers</h1>
      <p className="mt-1.5 max-w-xl text-sm text-ink-3">
        Each marker opens its full history. The catalog covers {biomarkers.filter((b) => !b.isCustom).length}{" "}
        common blood tests, plus any you add yourself.
      </p>
      <div className="mt-7">
        <Suspense>
          <BiomarkerBrowser
            base={ctx.base}
            biomarkers={biomarkers.map((b) => ({
              id: b.id,
              name: b.name,
              aliases: b.aliases,
              category: b.category,
              canonicalUnit: b.canonicalUnit,
              isCustom: b.isCustom,
              archived: b.archived,
            }))}
            digests={digests}
          />
        </Suspense>
      </div>
    </div>
  );
}
