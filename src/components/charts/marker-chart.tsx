"use client";

import { useMemo, useRef, useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import type { RefRange, LifeEvent, ResultStatus } from "@/lib/domain";
import { STATUS_LABEL, formatMeasured } from "@/lib/domain";
import type { SeriesPoint } from "@/lib/analytics";
import { StatusBadge } from "@/components/ui/status-badge";
import { RangeBar } from "@/components/charts/range-bar";
import { CountUp } from "@/components/motion/reveal";

/*
  The hero of the marker detail screen, per the handoff's phone mock: mono
  label → 56px tabular reading + status pill → mono meta line → segmented
  range control → one line across the years with each dot stroked in its
  status colour and the target band shaded. Entry choreography (once): value
  counts up while the line draws L→R and dots pop sequentially; the latest
  dot and pill land last. Hovering (or arrow keys) scrubs the reading.
*/

const WINDOWS = [
  { key: "1y", label: "1Y", months: 12 },
  { key: "3y", label: "3Y", months: 36 },
  { key: "8y", label: "8Y", months: 96 },
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

// Canonical bounds in, display-unit label out (divide by the display factor).
function fmtRange(r: RefRange | null | undefined, factor: number): string | null {
  if (!r || (r.min == null && r.max == null)) return null;
  const d = (v: number) => formatMeasured(v / factor);
  if (r.min != null && r.max != null) return `${d(r.min)}–${d(r.max)}`;
  if (r.max != null) return `< ${d(r.max)}`;
  return `> ${d(r.min!)}`;
}

// Plot geometry (viewBox units; the svg itself is fluid)
const W = 680;
const H = 240;
const M = { t: 18, r: 14, b: 28, l: 46 };

export function MarkerChart({
  name,
  unit,
  displayFactor = 1,
  points,
  bandRange,
  sexBands,
  events,
}: {
  name: string;
  unit: string;
  /** Divide canonical values by this to render them in `unit`. */
  displayFactor?: number;
  points: SeriesPoint[];
  bandRange: RefRange | null;
  sexBands?: RefRange[];
  events: LifeEvent[];
}) {
  // Values/geometry stay canonical; only printed labels convert to `unit`.
  const toDisplay = (v: number) => formatMeasured(v / displayFactor);
  const [win, setWin] = useState<WindowKey>("all");
  const [hover, setHover] = useState<number | null>(null);
  const [everHovered, setEverHovered] = useState(false);
  // false until the user changes window; later draws run faster (0.55s)
  const [drawFast, setDrawFast] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const all = useMemo(
    () => points.map((p) => ({ ...p, ts: isoToTs(p.date) })),
    [points],
  );

  const data = useMemo(() => {
    const months = WINDOWS.find((w) => w.key === win)?.months;
    if (months == null) return all;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffTs = cutoff.getTime();
    return all.filter((p) => p.ts >= cutoffTs);
  }, [all, win]);

  const domain = useMemo(() => {
    const values = data.map((p) => p.value);
    const bounds = [
      bandRange?.min,
      bandRange?.max,
      ...(sexBands ?? []).flatMap((b) => [b.min, b.max]),
    ].filter((v): v is number => v != null);
    const lo0 = Math.min(...values, ...bounds);
    const hi0 = Math.max(...values, ...bounds);
    const pad = (hi0 - lo0 || Math.abs(hi0) || 1) * 0.18;
    return { min: Math.max(0, lo0 - pad), max: hi0 + pad };
  }, [data, bandRange, sexBands]);

  const tsMin = data.length ? data[0].ts : 0;
  const tsMax = data.length ? data[data.length - 1].ts : 1;
  const x = (ts: number) =>
    tsMax === tsMin
      ? M.l + (W - M.l - M.r) / 2
      : M.l + ((ts - tsMin) / (tsMax - tsMin)) * (W - M.l - M.r);
  const y = (v: number) =>
    H - M.b - ((v - domain.min) / (domain.max - domain.min || 1)) * (H - M.t - M.b);

  // Which point feeds the big reading: the scrubbed one, else the latest.
  const latest = all[all.length - 1];
  const shown = hover != null && data[hover] ? data[hover] : latest;
  const scrubbed = hover != null && data[hover] != null;

  // X ticks: 4 evenly spaced; year-only labels once the span exceeds ~2y.
  const ticks = useMemo(() => {
    if (data.length < 2) return [];
    const span = tsMax - tsMin;
    const yearSpan = span / (365.25 * 24 * 3600 * 1000);
    const n = 4;
    return Array.from({ length: n }, (_, i) => {
      const ts = tsMin + (span * i) / (n - 1);
      const d = new Date(ts);
      const label =
        yearSpan > 2
          ? `'${String(d.getUTCFullYear()).slice(2)}`
          : `${d.toLocaleString("en", { month: "short", timeZone: "UTC" })} '${String(d.getUTCFullYear()).slice(2)}`;
      return { ts, label };
    });
  }, [data.length, tsMin, tsMax]);

  const yTicks = useMemo(() => {
    const vals: number[] = [];
    if (bandRange?.min != null) vals.push(bandRange.min);
    if (bandRange?.max != null) vals.push(bandRange.max);
    if (vals.length === 0) vals.push(domain.min, domain.max);
    return vals;
  }, [bandRange, domain]);

  const visibleEvents = useMemo(
    () =>
      events
        .map((e) => ({ ...e, ts: isoToTs(e.date) }))
        .filter((e) => e.ts >= tsMin && e.ts <= tsMax && data.length > 1),
    [events, tsMin, tsMax, data.length],
  );

  const linePts = data.map((p) => `${x(p.ts)},${y(p.value)}`).join(" ");
  const band = bandRange
    ? { y1: bandRange.min ?? domain.min, y2: bandRange.max ?? domain.max }
    : null;

  const target = fmtRange(bandRange, displayFactor);

  function selectWindow(k: WindowKey) {
    if (k === win) return;
    setDrawFast(true);
    setHover(null);
    setWin(k);
  }

  function scrubTo(clientX: number) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    data.forEach((p, i) => {
      const d = Math.abs(x(p.ts) - vx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
    setEverHovered(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (data.length === 0) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -1 : 1;
      const cur = hover ?? data.length - 1;
      setHover(Math.min(data.length - 1, Math.max(0, cur + step)));
      setEverHovered(true);
    } else if (e.key === "Escape") {
      setHover(null);
    }
  }

  return (
    <div>
      {/* Reading block: label · big value + pill · meta line */}
      <p className="au-eyebrow">
        {name} · {unit}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className="au-hl tnum text-[3.25rem] leading-none tracking-[-0.03em] text-ink sm:text-[3.5rem]"
          aria-live="polite"
        >
          {scrubbed || everHovered ? (
            toDisplay(shown.value)
          ) : (
            <CountUp value={latest.value / displayFactor} startDelay={250} />
          )}
        </span>
        <span className="mk-pop" style={{ "--d": "1150ms" } as React.CSSProperties}>
          <StatusBadge status={shown.status} />
        </span>
      </div>
      <p className="au-mono mt-3 text-[11px] text-ink-3">
        {scrubbed ? (
          <>
            {formatDate(shown.date)}
            {fmtRange(shown.appliedRange, displayFactor) && (
              <> · range {fmtRange(shown.appliedRange, displayFactor)}</>
            )}
            {shown.labName && <> · {shown.labName}</>}
          </>
        ) : (
          <>
            {target ? <>Target {target} · </> : null}
            Measured {formatDate(latest.date)}
          </>
        )}
      </p>
      {bandRange && (bandRange.min != null || bandRange.max != null) && (
        <RangeBar
          value={shown.value}
          min={bandRange.min ?? undefined}
          max={bandRange.max ?? undefined}
          status={shown.status}
          className="mt-4 max-w-56"
        />
      )}

      {/* Range segments */}
      <div className="au-seg mt-6" role="group" aria-label="Time range">
        {WINDOWS.map((w) => (
          <button
            key={w.key}
            type="button"
            aria-pressed={win === w.key}
            onClick={() => selectWindow(w.key)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {/* The chart */}
      <figure
        className="mt-4"
        role="img"
        aria-label={`${name} over time: ${data.length} measurements, latest ${toDisplay(latest.value)} ${unit} (${STATUS_LABEL[latest.status]})`}
      >
        {data.length === 0 ? (
          <p className="border-t border-line py-10 text-sm text-ink-3">
            No results in this window.
          </p>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full cursor-crosshair touch-none select-none focus-visible:outline-1 focus-visible:outline-brand"
            tabIndex={0}
            onPointerMove={(e) => scrubTo(e.clientX)}
            onPointerDown={(e) => scrubTo(e.clientX)}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setHover(null)}
          >
            {/* Target band (accent tint — data, not decoration) */}
            {band && (
              <rect
                x={M.l}
                y={Math.min(y(band.y1), y(band.y2))}
                width={W - M.l - M.r}
                height={Math.abs(y(band.y1) - y(band.y2))}
                fill="var(--brand)"
                opacity={0.06}
              />
            )}
            {/* Faint dual bands when sex is OTHER and ranges are conditional */}
            {!band &&
              (sexBands ?? []).map((b, i) => (
                <rect
                  key={i}
                  x={M.l}
                  y={Math.min(y(b.min ?? domain.min), y(b.max ?? domain.max))}
                  width={W - M.l - M.r}
                  height={Math.abs(y(b.min ?? domain.min) - y(b.max ?? domain.max))}
                  fill="var(--in-range)"
                  opacity={0.05}
                />
              ))}

            {/* Axes: mono ticks, hairlines only where they carry meaning */}
            {yTicks.map((v) => (
              <g key={`y${v}`}>
                <line
                  x1={M.l}
                  x2={W - M.r}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--line)"
                  strokeDasharray="2 4"
                />
                <text
                  x={M.l - 8}
                  y={y(v) + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--ink-3)"
                  fontFamily="var(--font-mono)"
                  className="tnum"
                >
                  {toDisplay(v)}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <text
                key={t.ts}
                x={x(t.ts)}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--ink-3)"
                fontFamily="var(--font-mono)"
              >
                {t.label}
              </text>
            ))}

            {/* Life events: dashed rules with mono labels */}
            {visibleEvents.map((e) => (
              <g key={e.id}>
                <line
                  x1={x(e.ts)}
                  x2={x(e.ts)}
                  y1={M.t}
                  y2={H - M.b}
                  stroke="var(--ink-3)"
                  strokeOpacity={0.4}
                  strokeDasharray="3 4"
                />
                <text
                  x={Math.min(x(e.ts) + 5, W - M.r - 4)}
                  y={M.t + 8}
                  fontSize={9}
                  fill="var(--ink-3)"
                  fontFamily="var(--font-mono)"
                  style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {e.label.length > 24 ? `${e.label.slice(0, 23)}…` : e.label}
                </text>
              </g>
            ))}

            {/* Scrub cursor */}
            {scrubbed && (
              <line
                x1={x(data[hover!].ts)}
                x2={x(data[hover!].ts)}
                y1={M.t}
                y2={H - M.b}
                stroke="var(--rule)"
                strokeDasharray="3 3"
              />
            )}

            {/* Line + status dots — keyed by window so the draw re-runs */}
            <g key={win}>
              {data.length > 1 && (
                <polyline
                  points={linePts}
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                  pathLength={1}
                  className={cn("mk-line", drawFast && "mk-line--fast")}
                />
              )}
              {data.map((p, i) => {
                const last = i === data.length - 1;
                const delay = drawFast
                  ? 80 + (i * 320) / Math.max(1, data.length - 1)
                  : 150 + (i * 750) / Math.max(1, data.length - 1);
                return (
                  <circle
                    key={p.resultId}
                    cx={x(p.ts)}
                    cy={y(p.value)}
                    r={last ? 5 : 4}
                    fill={last ? STATUS_COLOR[p.status] : "var(--page-bg)"}
                    stroke={STATUS_COLOR[p.status]}
                    strokeWidth={1.6}
                    className="mk-dot"
                    style={{ "--d": `${delay}ms` } as React.CSSProperties}
                  />
                );
              })}
            </g>
            {scrubbed && (
              <circle
                cx={x(data[hover!].ts)}
                cy={y(data[hover!].value)}
                r={8}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={1.2}
                opacity={0.8}
              />
            )}
          </svg>
        )}
      </figure>
    </div>
  );
}
