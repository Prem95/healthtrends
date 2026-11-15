"use client";

import { useState } from "react";
import type { SeriesPoint } from "@/lib/analytics";
import type { LifeEvent, RefRange } from "@/lib/domain";
import { MarkerChart } from "@/components/charts/marker-chart";

export type ShowcaseMarker = {
  id: string;
  name: string;
  /** Short name for the switch. */
  label: string;
  unit: string;
  points: SeriesPoint[];
  bandRange: RefRange | null;
  events: LifeEvent[];
  /** One sentence on what this line shows. */
  story: string;
};

/*
  The marker screen, live on the landing page: the same chart component the
  app uses, over sample data, with a switch between three markers that each
  tell a different kind of story.
*/
export function MarkerShowcase({ markers }: { markers: ShowcaseMarker[] }) {
  const [active, setActive] = useState(markers[0].id);
  const m = markers.find((x) => x.id === active) ?? markers[0];

  return (
    <div className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="seg max-w-full overflow-x-auto" role="group" aria-label="Sample marker">
          {markers.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={x.id === active}
              onClick={() => setActive(x.id)}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3">Sample data · point at the chart to read any test</p>
      </div>
      <div className="pt-5">
        {/* Keyed so the line redraws when the marker changes */}
        <MarkerChart
          key={m.id}
          name={m.name}
          unit={m.unit}
          points={m.points}
          bandRange={m.bandRange}
          events={m.events}
        />
      </div>
      <p className="mt-3 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
        {m.story}
      </p>
    </div>
  );
}
