"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge, Badge } from "@/components/ui/status-badge";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type BiomarkerCategory,
  type ResultStatus,
} from "@/lib/domain";

type Item = {
  id: string;
  name: string;
  aliases: string[];
  category: BiomarkerCategory;
  canonicalUnit: string;
  isCustom: boolean;
  archived: boolean;
};

type Latest = {
  value: number | null;
  date: string | null;
  status: ResultStatus;
  count: number;
  spark: number[];
};

export function BiomarkerBrowser({
  biomarkers,
  latestById,
}: {
  biomarkers: Item[];
  latestById: Record<string, Latest>;
}) {
  const [query, setQuery] = useState("");
  const [trackedOnly, setTrackedOnly] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = biomarkers.filter((b) => {
      if (b.archived && !latestById[b.id]) return false;
      if (trackedOnly && !latestById[b.id]) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.aliases.some((a) => a.toLowerCase().includes(q))
      );
    });
    const map = new Map<BiomarkerCategory, Item[]>();
    for (const b of filtered) {
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }, [biomarkers, latestById, query, trackedOnly]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markers and aliases"
            className="pl-9"
            aria-label="Search biomarkers"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={trackedOnly}
            onChange={(e) => setTrackedOnly(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          With data only
        </label>
      </div>

      <div className="mt-6 space-y-8">
        {groups.length === 0 && (
          <p className="text-sm text-ink-3">No markers match &quot;{query}&quot;.</p>
        )}
        {groups.map(({ category, items }) => (
          <section key={category}>
            <h2 className="microlabel rule-top pt-2">
              {CATEGORY_LABEL[category]}
            </h2>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-paper">
              {items.map((b) => {
                const latest = latestById[b.id];
                return (
                  <li key={b.id}>
                    <Link
                      href={`/app/biomarkers/${b.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper-2"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                          {b.name}
                          {b.isCustom && <Badge tone="brand">Custom</Badge>}
                          {b.archived && <Badge>Archived</Badge>}
                        </p>
                        {latest?.date && (
                          <p className="text-xs text-ink-3">
                            {latest.count} value{latest.count === 1 ? "" : "s"} · last{" "}
                            {formatDate(latest.date)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {latest?.spark && latest.spark.length >= 2 && (
                          <Sparkline values={latest.spark} />
                        )}
                        {latest?.value != null ? (
                          <>
                            <span className="tnum text-sm text-ink-2">
                              {formatNumber(latest.value)}{" "}
                              <span className="text-ink-3">{b.canonicalUnit}</span>
                            </span>
                            <StatusBadge status={latest.status} />
                          </>
                        ) : (
                          <span className="text-xs text-ink-3">no data</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Data-bearing mini trend for markers with ≥2 values (not decoration). */
function Sparkline({ values }: { values: number[] }) {
  const w = 72;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="hidden sm:block" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
      />
    </svg>
  );
}
