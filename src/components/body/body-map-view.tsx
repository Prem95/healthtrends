"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { BiomarkerCategory } from "@/lib/domain";
import { BODY_REGIONS, type RegionData } from "@/lib/body-map";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNumber } from "@/lib/utils";

// three.js is heavy; load it only when this route renders, client-side.
const BodyScene = dynamic(() => import("./body-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <p className="text-sm text-ink-3">Loading the figure...</p>
    </div>
  ),
});

export function BodyMapView({ regions }: { regions: RegionData[] }) {
  const [selected, setSelected] = useState<BiomarkerCategory | null>(null);
  const regionMeta = useMemo(
    () => new Map(BODY_REGIONS.map((r) => [r.category, r])),
    [],
  );
  const active = selected ? regions.find((r) => r.category === selected) : null;
  const activeMeta = selected ? regionMeta.get(selected) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="h-[520px] rounded-md border border-line bg-paper">
        <BodyScene regions={regions} selected={selected} onSelect={setSelected} />
      </div>

      <aside>
        {active && activeMeta ? (
          <div className="animate-rise">
            <p className="microlabel rule-top pt-2">{activeMeta.label}</p>
            <p className="mt-1 text-sm text-ink-3">{activeMeta.note}</p>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {active.markers.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/app/biomarkers/${m.id}`}
                    className="flex items-baseline gap-2 py-2.5 hover:bg-paper-2"
                  >
                    <span className="text-sm font-medium text-ink">{m.name}</span>
                    <span className="leader" aria-hidden />
                    <span className="tnum text-sm text-ink-2">
                      {m.value != null ? formatNumber(m.value) : "n/a"} {m.unit}
                    </span>
                    <StatusBadge status={m.status} />
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSelected(null)}
              className="mt-3 cursor-pointer text-xs text-ink-3 underline underline-offset-2 hover:text-ink"
            >
              Clear selection
            </button>
          </div>
        ) : (
          <div>
            <p className="microlabel rule-top pt-2">How to read this</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-2">
              Each mark sits on the body system its markers describe. The color
              is the worst current status in that group. Click a mark or its
              label to list the values behind it. Drag to turn the figure.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-ink-2">
              <li className="flex items-center gap-2">
                <span className="size-2 bg-in-range" /> everything in range
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2 bg-borderline" /> at least one value near a boundary
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2 bg-out" /> at least one value out of range
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2 bg-neutral-status" /> no reference range
              </li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
