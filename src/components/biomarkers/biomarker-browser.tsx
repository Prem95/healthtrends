"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MarkerList, MarkerRow } from "@/components/markers/marker-parts";
import { needsAttention, type MarkerDigest } from "@/lib/digest";
import { prettyUnit } from "@/lib/utils";
import { CATEGORY_LABEL, type BiomarkerCategory } from "@/lib/domain";
import { CATEGORY_COMMON_ORDER, sortByCommonality } from "@/lib/commonality";

type Item = {
  id: string;
  name: string;
  aliases: string[];
  category: BiomarkerCategory;
  canonicalUnit: string;
  isCustom: boolean;
  archived: boolean;
};

type Show = "results" | "attention" | "all";

const FILTERS: { key: Show; label: string }[] = [
  { key: "results", label: "With results" },
  { key: "attention", label: "Worth a look" },
  { key: "all", label: "Whole catalog" },
];

/*
  Every marker, grouped by body system. Three scopes (what you have results
  for, what is outside or near a limit, the whole catalog) and a search that
  also matches the abbreviations printed on lab reports.
*/
export function BiomarkerBrowser({
  biomarkers,
  digests,
  base,
}: {
  biomarkers: Item[];
  digests: Record<string, MarkerDigest>;
  base: string;
}) {
  const hasAnyData = Object.keys(digests).length > 0;
  const param = useSearchParams().get("show");
  const initial: Show =
    param === "attention" || param === "all" || param === "results"
      ? param
      : hasAnyData
        ? "results"
        : "all";
  const [show, setShow] = useState<Show>(initial);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = biomarkers.filter((b) => {
      const d = digests[b.id];
      if (b.archived && !d) return false;
      if (show === "results" && !d) return false;
      if (show === "attention" && !(d && needsAttention(d.status))) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) || b.aliases.some((a) => a.toLowerCase().includes(q))
      );
    });
    const map = new Map<BiomarkerCategory, Item[]>();
    for (const b of filtered) {
      if (!map.has(b.category)) map.set(b.category, []);
      map.get(b.category)!.push(b);
    }
    return CATEGORY_COMMON_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: sortByCommonality(map.get(c)!),
    }));
  }, [biomarkers, digests, query, show]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or abbreviation — LDL, A1c, TSH…"
            className="pl-9"
            aria-label="Search markers"
          />
        </div>
        <div className="seg" role="group" aria-label="Which markers to show">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={show === f.key}
              onClick={() => setShow(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-3" aria-live="polite">
        {total} marker{total === 1 ? "" : "s"}
        {query.trim() ? ` matching “${query.trim()}”` : ""}
      </p>

      <div className="mt-4 space-y-8">
        {groups.length === 0 && (
          <div className="card px-5 py-10 text-center text-sm text-ink-2">
            {show === "attention" && !query.trim()
              ? "Nothing is outside or near a limit on its latest test."
              : "No markers match. Try the whole catalog or a different spelling."}
          </div>
        )}
        {groups.map(({ category, items }) => (
          <section key={category} id={category} className="scroll-mt-24">
            <h2 className="mb-3 flex items-baseline gap-2 text-base font-medium text-ink">
              {CATEGORY_LABEL[category]}
              <span className="font-normal text-ink-3 tnum">{items.length}</span>
            </h2>
            <MarkerList>
              {items.map((b) => (
                <MarkerRow
                  key={b.id}
                  d={digests[b.id] ?? blank(b)}
                  href={`${base}/biomarkers/${b.id}`}
                />
              ))}
            </MarkerList>
          </section>
        ))}
      </div>
    </div>
  );
}

function blank(b: Item): MarkerDigest {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    isCustom: b.isCustom,
    unit: prettyUnit(b.canonicalUnit),
    displayFactor: 1,
    count: 0,
    value: null,
    valueLabel: null,
    date: null,
    status: "NO_RANGE",
    spark: [],
    deltaLabel: null,
    prevDate: null,
  };
}
