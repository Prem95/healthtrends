"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { StatusBadge, Badge } from "@/components/ui/status-badge";
import { Sparkline } from "@/components/charts/sparkline";
import { formatDate } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  statusTone,
  type BiomarkerCategory,
  type ResultStatus,
} from "@/lib/domain";
import { CATEGORY_COMMON_ORDER, sortByCommonality } from "@/lib/commonality";

type Item = {
  id: string;
  name: string;
  aliases: string[];
  category: BiomarkerCategory;
  isCustom: boolean;
  archived: boolean;
};

type Latest = {
  hasValue: boolean;
  valueLabel: string | null;
  unit: string;
  date: string | null;
  status: ResultStatus;
  count: number;
  spark: number[];
};

const TONE_VAR: Record<string, string> = {
  "in-range": "var(--in-range)",
  borderline: "var(--borderline)",
  out: "var(--out)",
  neutral: "var(--neutral-status)",
};

const FLAGGED: ResultStatus[] = ["LOW", "HIGH", "BORDERLINE_LOW", "BORDERLINE_HIGH"];
function isFlagged(latest: Latest | undefined): boolean {
  return latest ? FLAGGED.includes(latest.status) : false;
}

export function BiomarkerBrowser({
  biomarkers,
  latestById,
}: {
  biomarkers: Item[];
  latestById: Record<string, Latest>;
}) {
  const [query, setQuery] = useState("");
  const [trackedOnly, setTrackedOnly] = useState(false);

  // "?review=<CATEGORY>" narrows the browser to just the flagged (out-of-range
  // or near-boundary) markers in one system.
  const searchParams = useSearchParams();
  const reviewParam = searchParams.get("review");
  const review = reviewParam && reviewParam in CATEGORY_LABEL
    ? (reviewParam as BiomarkerCategory)
    : null;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = biomarkers.filter((b) => {
      if (b.archived && !latestById[b.id]) return false;
      if (review) {
        if (b.category !== review) return false;
        if (!isFlagged(latestById[b.id])) return false;
      } else if (trackedOnly && !latestById[b.id]) return false;
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
    return CATEGORY_COMMON_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: sortByCommonality(map.get(c)!),
    }));
  }, [biomarkers, latestById, query, trackedOnly, review]);

  return (
    <div>
      {review && (
        <div className="au-card mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-ink-2">
            Showing markers to review in{" "}
            <span className="font-medium text-ink">{CATEGORY_LABEL[review]}</span>.
          </p>
          <Link
            href="/app/biomarkers"
            className="au-mono text-[12px] text-brand transition-colors duration-300 hover:text-brand-strong"
          >
            Show all →
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markers and aliases"
          className="min-w-56 flex-1"
          aria-label="Search biomarkers"
        />
        <label className="au-mono flex cursor-pointer items-center gap-2 text-[11px] text-ink-2">
          <input
            type="checkbox"
            checked={trackedOnly}
            onChange={(e) => setTrackedOnly(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          With data only
        </label>
      </div>

      <div className="mt-8 space-y-10">
        {groups.length === 0 && (
          <p className="text-sm text-ink-3">No markers match &quot;{query}&quot;.</p>
        )}
        {groups.map(({ category, items }, gi) => (
          <section key={category} id={category} className="scroll-mt-24">
            <h2 className="au-eyebrow flex items-baseline gap-2">
              <span className="au-num text-ink-3/70">
                {String(gi + 1).padStart(2, "0")}.
              </span>
              {CATEGORY_LABEL[category]}
            </h2>
            <ul className="mt-1">
              {items.map((b) => {
                const latest = latestById[b.id];
                const tone = latest ? statusTone(latest.status) : "neutral";
                return (
                  <li key={b.id}>
                    <Link
                      href={`/app/biomarkers/${b.id}`}
                      className="au-row flex items-center gap-4 border-t border-line py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="au-row-title flex items-center gap-2 truncate text-[15px] font-medium text-ink">
                          {b.name}
                          {b.isCustom && <Badge tone="brand">Custom</Badge>}
                          {b.archived && <Badge>Archived</Badge>}
                        </p>
                        {latest?.date && (
                          <p className="au-mono mt-1 text-[10px] text-ink-3">
                            {latest.count} value{latest.count === 1 ? "" : "s"} · last{" "}
                            {formatDate(latest.date)}
                          </p>
                        )}
                      </div>
                      {latest?.spark && latest.spark.length >= 2 && (
                        <Sparkline
                          values={latest.spark}
                          stroke={TONE_VAR[tone]}
                          className="hidden shrink-0 sm:block"
                        />
                      )}
                      {latest?.hasValue ? (
                        <>
                          <span className="au-num shrink-0 text-[13px] text-ink-3">
                            {latest.valueLabel}{" "}
                            <span className="text-ink-3/70">{latest.unit}</span>
                          </span>
                          <StatusBadge status={latest.status} className="shrink-0" />
                        </>
                      ) : (
                        <span className="au-mono shrink-0 text-[10px] text-ink-3/70">
                          No data
                        </span>
                      )}
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
