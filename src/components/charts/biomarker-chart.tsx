"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { RefRange, LifeEvent, ResultStatus } from "@/lib/domain";
import { STATUS_LABEL } from "@/lib/domain";
import type { SeriesPoint } from "@/lib/analytics";

const WINDOWS = [
  { key: "6m", label: "6m", months: 6 },
  { key: "1y", label: "1y", months: 12 },
  { key: "3y", label: "3y", months: 36 },
  { key: "5y", label: "5y", months: 60 },
  { key: "all", label: "All", months: null },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

const STATUS_COLOR: Record<ResultStatus, string> = {
  IN_RANGE: "var(--in-range)",
  BORDERLINE_LOW: "var(--borderline)",
  BORDERLINE_HIGH: "var(--borderline)",
  LOW: "var(--out)",
  HIGH: "var(--out)",
  NO_RANGE: "var(--neutral-status)",
};

function isoToTs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function BiomarkerChart({
  points,
  bandRange,
  sexBands,
  events,
  unit,
  className,
}: {
  points: SeriesPoint[];
  /** Chart band = most recent applicable range (each point still flags by its own). */
  bandRange: RefRange | null;
  /** When profile sex is OTHER and ranges are sex-conditional: both bands, faint. */
  sexBands?: RefRange[];
  events: LifeEvent[];
  unit: string;
  className?: string;
}) {
  const [win, setWin] = useState<WindowKey>("all");

  const data = useMemo(() => {
    const all = points.map((p) => ({ ...p, ts: isoToTs(p.date) }));
    const months = WINDOWS.find((w) => w.key === win)?.months;
    if (months == null) return all;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffTs = cutoff.getTime();
    return all.filter((p) => p.ts >= cutoffTs);
  }, [points, win]);

  const domain = useMemo(() => {
    const values = data.map((p) => p.value);
    const boundVals = [
      bandRange?.min,
      bandRange?.max,
      ...(sexBands ?? []).flatMap((b) => [b.min, b.max]),
    ].filter((v): v is number => v != null);
    const all = [...values, ...boundVals];
    if (all.length === 0) return { min: 0, max: 1 };
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.15;
    return { min: Math.max(0, lo - pad), max: hi + pad };
  }, [data, bandRange, sexBands]);

  const visibleEvents = useMemo(() => {
    if (data.length === 0) return [];
    const minTs = data[0].ts;
    const maxTs = data[data.length - 1].ts;
    return events
      .map((e) => ({ ...e, ts: isoToTs(e.date) }))
      .filter((e) => e.ts >= minTs && e.ts <= maxTs);
  }, [events, data]);

  // One-sided ranges band to the chart edge, never invent the missing bound.
  const band = bandRange
    ? {
        y1: bandRange.min ?? domain.min,
        y2: bandRange.max ?? domain.max,
      }
    : null;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-end gap-1">
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            onClick={() => setWin(w.key)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              win === w.key
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-3 hover:bg-paper-2 hover:text-ink",
            )}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts: number) => {
                const d = new Date(ts);
                return `${d.toLocaleString("en", { month: "short", timeZone: "UTC" })} ’${String(d.getUTCFullYear()).slice(2)}`;
              }}
              tick={{ fill: "var(--ink-3)", fontSize: 11 }}
              axisLine={{ stroke: "var(--line-strong)" }}
              tickLine={false}
            />
            <YAxis
              domain={[domain.min, domain.max]}
              tick={{ fill: "var(--ink-3)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
              tickFormatter={(v: number) => formatNumber(v, 1)}
            />

            {/* Faint dual bands when sex is OTHER and ranges are conditional */}
            {!band &&
              (sexBands ?? []).map((b, i) => (
                <ReferenceArea
                  key={i}
                  y1={b.min ?? domain.min}
                  y2={b.max ?? domain.max}
                  fill="var(--in-range)"
                  fillOpacity={0.06}
                  stroke="var(--in-range)"
                  strokeOpacity={0.15}
                />
              ))}

            {band && (
              <ReferenceArea
                y1={band.y1}
                y2={band.y2}
                fill="var(--in-range)"
                fillOpacity={0.1}
                stroke="var(--in-range)"
                strokeOpacity={0.25}
              />
            )}

            {visibleEvents.map((e) => (
              <ReferenceLine
                key={e.id}
                x={e.ts}
                stroke="var(--brand)"
                strokeDasharray="4 3"
                strokeOpacity={0.55}
                label={{
                  value: e.label,
                  position: "top",
                  fill: "var(--brand-strong)",
                  fontSize: 10,
                }}
              />
            ))}

            <Tooltip
              content={<PointTooltip unit={unit} />}
              cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--brand)"
              strokeWidth={2.25}
              isAnimationActive={false}
              dot={<StatusDot />}
              activeDot={{ r: 6, stroke: "var(--brand)", fill: "var(--paper)", strokeWidth: 2.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: SeriesPoint & { ts: number };
};

function StatusDot(props: DotProps) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill="var(--paper)"
      stroke={STATUS_COLOR[payload.status]}
      strokeWidth={2.5}
    />
  );
}

function formatRange(r: RefRange | null): string {
  if (!r || (r.min == null && r.max == null)) return "No reference range";
  if (r.min != null && r.max != null) return `${formatNumber(r.min)}–${formatNumber(r.max)}`;
  if (r.max != null) return `< ${formatNumber(r.max)}`;
  return `> ${formatNumber(r.min!)}`;
}

function PointTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: SeriesPoint & { ts: number } }[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-paper px-3.5 py-3 shadow-lg">
      <p className="text-xs text-ink-3">{formatDate(p.date)}</p>
      <p className="mt-1 font-display text-xl text-ink tnum">
        {formatNumber(p.value)} <span className="text-sm text-ink-3">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-ink-2">
        Range that applied: <span className="tnum">{formatRange(p.appliedRange)}</span>
      </p>
      <p
        className="mt-0.5 text-xs font-medium"
        style={{ color: STATUS_COLOR[p.status] }}
      >
        {STATUS_LABEL[p.status]}
      </p>
      {p.labName && <p className="mt-0.5 text-xs text-ink-3">{p.labName}</p>}
    </div>
  );
}
