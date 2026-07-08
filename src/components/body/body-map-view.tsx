"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { BiomarkerCategory } from "@/lib/domain";
import { BODY_REGIONS, type RegionData } from "@/lib/body-map";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatNumber } from "@/lib/utils";
import { sortByCommonality } from "@/lib/commonality";

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
  const activeMarkers = active ? sortByCommonality(active.markers) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div
        className="h-[340px] overflow-hidden rounded-[20px] border border-line sm:h-[420px] lg:h-[480px]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 12%, #eef3f4 0%, #dde6ea 55%, #cfdbe1 100%)",
        }}
      >
        <BodyScene regions={regions} selected={selected} onSelect={setSelected} />
      </div>

      <aside>
        {active && activeMeta ? (
          <div className="animate-rise">
            <div className="flex items-center justify-between gap-2 rule-top pt-2">
              <p className="microlabel">{activeMeta.label}</p>
              <span className="tnum text-xs text-ink-3">
                {activeMarkers.length} marker{activeMarkers.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-3">{activeMeta.note}</p>
            <ul className="au-card mt-4 divide-y divide-line overflow-hidden">
              {activeMarkers.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/app/biomarkers/${m.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-paper-2"
                  >
                    <span className="truncate text-sm font-medium text-ink">{m.name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tnum text-sm text-ink-2">
                        {m.value != null ? formatNumber(m.value) : "n/a"} {m.unit}
                      </span>
                      <StatusBadge status={m.status} />
                    </span>
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
              Each organ stands for the body system its markers describe, coloured
              by the worst current status in that group. Click an organ or its
              label to list the values behind it, most common first. Drag to turn
              the figure.
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
