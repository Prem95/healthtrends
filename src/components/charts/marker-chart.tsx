"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn, formatDate, prettyUnit } from "@/lib/utils";
import type { RefRange, LifeEvent, ResultStatus } from "@/lib/domain";
import { STATUS_LABEL, formatDelta, formatMeasured, statusTone } from "@/lib/domain";
import type { SeriesPoint } from "@/lib/analytics";
import { StatusBadge, StatusGlyph } from "@/components/ui/status-badge";
import { RangeBar } from "@/components/charts/range-bar";

/*
  One marker across the years. A reading block (value, status, change since
  the previous test, where it sits in its range) sits over a single line: the
  reference range shaded as a band, each test a dot in its status colour.
  Pointing at the chart — or using the arrow keys — moves the reading block to
  that test, so the same block is both headline and tooltip. The history table
  under the chart is its plain-text twin.
*/

const WINDOWS = [
  { key: "1y", label: "1Y", months: 12 },
  { key: "3y", label: "3Y", months: 36 },
  { key: "5y", label: "5Y", months: 60 },
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

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

function isoToTs(iso: string): number {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// Canonical bounds in, display-unit label out (divide by the display factor).
function fmtRange(r: RefRange | null | undefined, factor: number): string | null {
  if (!r || (r.min == null && r.max == null)) return null;
  const d = (v: number) => formatMeasured(v / factor);
  if (r.min != null && r.max != null) return `${d(r.min)}–${d(r.max)}`;
  if (r.max != null) return `under ${d(r.max)}`;
  return `over ${d(r.min!)}`;
}

/**
 * One test on the line. The shape repeats the status glyph used everywhere
 * else (dot in range, diamond borderline, arrow out of range), so status is
 * readable without colour; a 2px surface ring keeps it clear of the line.
 */
function PointMark({ status, size: s, delay }: { status: ResultStatus; size: number; delay: number }) {
  const common = {
    fill: STATUS_COLOR[status],
    stroke: "var(--paper)",
    strokeWidth: 2,
    strokeLinejoin: "round" as const,
    className: "mk-dot",
    style: { "--d": `${delay}ms` } as React.CSSProperties,
  };
  switch (status) {
    case "BORDERLINE_HIGH":
    case "BORDERLINE_LOW":
      return <path d={`M0 ${-s - 1}L${s + 1} 0 0 ${s + 1}${-s - 1} 0Z`} {...common} />;
    case "HIGH":
      return <path d={`M0 ${-s - 1}L${s + 1} ${s - 1}H${-s - 1}Z`} {...common} />;
    case "LOW":
      return <path d={`M0 ${s + 1}L${s + 1} ${-s + 1}H${-s - 1}Z`} {...common} />;
    case "NO_RANGE":
      return <circle r={s - 1} {...common} fill="var(--paper)" stroke={STATUS_COLOR[status]} />;
    default:
      return <circle r={s} {...common} />;
  }
}

/** Round, evenly spaced axis values covering [lo, hi]. */
function niceTicks(lo: number, hi: number, target = 4): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) {
    out.push(Number(v.toPrecision(10)));
  }
  return out;
}

/** The SVG is drawn at its real pixel width so type stays at true size. */
function useMeasuredWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w >= 160) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function MarkerChart({
  name,
  unit: rawUnit,
  displayFactor = 1,
  points,
  bandRange,
  sexBands,
  events,
  defaultWindow = "all",
}: {
  name: string;
  unit: string;
  /** Divide canonical values by this to render them in `unit`. */
  displayFactor?: number;
  points: SeriesPoint[];
  bandRange: RefRange | null;
  sexBands?: RefRange[];
  events: LifeEvent[];
  defaultWindow?: WindowKey;
}) {
  const unit = prettyUnit(rawUnit);
  // Values/geometry stay canonical; only printed labels convert to `unit`.
  const toDisplay = (v: number) => formatMeasured(v / displayFactor);
  const [win, setWin] = useState<WindowKey>(defaultWindow);
  const [hover, setHover] = useState<number | null>(null);
  // false until the user changes window; later draws run faster
  const [drawFast, setDrawFast] = useState(false);
  const { ref: wrapRef, width: W } = useMeasuredWidth<HTMLDivElement>(680);
  const H = W < 480 ? 230 : 300;

  const all = useMemo(() => points.map((p) => ({ ...p, ts: isoToTs(p.date) })), [points]);

  const data = useMemo(() => {
    const months = WINDOWS.find((w) => w.key === win)?.months;
    if (months == null || all.length === 0) return all;
    // Windows count back from the latest test, so an old record still fills them.
    const end = new Date(all[all.length - 1].ts);
    end.setUTCMonth(end.getUTCMonth() - months);
    const cutoff = end.getTime();
    return all.filter((p) => p.ts >= cutoff);
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
    const pad = (hi0 - lo0 || Math.abs(hi0) || 1) * 0.16;
    return { min: Math.max(0, lo0 - pad), max: hi0 + pad };
  }, [data, bandRange, sexBands]);

  const tsMin = data.length ? data[0].ts : 0;
  const tsMax = data.length ? data[data.length - 1].ts : 1;

  // Life events inside the window. Labels that would collide drop to a second
  // row; a third simply keeps its rule and goes unlabelled.
  const visibleEvents = useMemo(() => {
    if (data.length < 2) return [];
    const inWindow = events
      .map((e) => ({ ...e, ts: isoToTs(e.date) }))
      .filter((e) => e.ts >= tsMin && e.ts <= tsMax)
      .sort((a, b) => a.ts - b.ts);
    const span = tsMax - tsMin || 1;
    const rowEnd = [-Infinity, -Infinity];
    return inWindow.map((e) => {
      const text = e.label.length > 26 ? `${e.label.slice(0, 25)}…` : e.label;
      const width = text.length * 6.2 + 14;
      const px = ((e.ts - tsMin) / span) * (W - 62);
      const flip = px + width > W - 62;
      const start = flip ? px - width : px;
      const row = rowEnd.findIndex((end) => start >= end);
      if (row >= 0) rowEnd[row] = start + width;
      return { ...e, text, flip, row };
    });
  }, [events, tsMin, tsMax, data.length, W]);
  const labelRows = visibleEvents.reduce((n, e) => Math.max(n, e.row + 1), 0);
  const M = { t: 14 + labelRows * 16, r: 18, b: 30, l: 44 };
  const plotW = Math.max(0, W - M.l - M.r);
  const plotH = H - M.t - M.b;
  const x = (ts: number) =>
    tsMax === tsMin ? M.l + plotW / 2 : M.l + ((ts - tsMin) / (tsMax - tsMin)) * plotW;
  const y = (v: number) =>
    H - M.b - ((v - domain.min) / (domain.max - domain.min || 1)) * plotH;

  const latest = all[all.length - 1];
  const scrubbed = hover != null && data[hover] != null;
  const shown = scrubbed ? data[hover!] : latest;
  const shownIdx = all.findIndex((p) => p.resultId === shown?.resultId);
  const prev = shownIdx > 0 ? all[shownIdx - 1] : null;
  const delta = prev ? shown.value - prev.value : null;

  // Y ticks are chosen in the display unit so they stay round after conversion.
  const yTicks = useMemo(
    () =>
      niceTicks(domain.min / displayFactor, domain.max / displayFactor).map((d) => ({
        label: String(d),
        value: d * displayFactor,
      })),
    [domain, displayFactor],
  );

  // X ticks: calendar years once the span is long enough, else even months.
  const xTicks = useMemo(() => {
    if (data.length < 2) return [];
    const span = tsMax - tsMin;
    if (span > 2 * YEAR_MS) {
      const y0 = new Date(tsMin).getUTCFullYear() + 1;
      const y1 = new Date(tsMax).getUTCFullYear();
      const maxLabels = Math.max(2, Math.floor(plotW / 64));
      const step = Math.max(1, Math.ceil((y1 - y0 + 1) / maxLabels));
      const out: { ts: number; label: string }[] = [];
      for (let yr = y0; yr <= y1; yr += step) {
        out.push({ ts: Date.UTC(yr, 0, 1), label: String(yr) });
      }
      return out;
    }
    const n = plotW < 360 ? 3 : 4;
    return Array.from({ length: n }, (_, i) => {
      const ts = tsMin + (span * i) / (n - 1);
      const d = new Date(ts);
      return {
        ts,
        label: `${d.toLocaleString("en", { month: "short", timeZone: "UTC" })} ${d.getUTCFullYear()}`,
      };
    });
  }, [data.length, tsMin, tsMax, plotW]);

  const band =
    bandRange && (bandRange.min != null || bandRange.max != null)
      ? {
          top: y(bandRange.max ?? domain.max),
          bottom: y(bandRange.min ?? domain.min),
          hasMax: bandRange.max != null,
          hasMin: bandRange.min != null,
        }
      : null;

  const target = fmtRange(bandRange, displayFactor);

  // One legend entry per status tone present in the window, in a fixed order.
  const tones = new Set(data.map((p) => statusTone(p.status)));
  const legend = (
    [
      { tone: "in-range", status: "IN_RANGE", label: "In range" },
      { tone: "borderline", status: "BORDERLINE_HIGH", label: "Borderline" },
      { tone: "out", status: "HIGH", label: "Out of range" },
      { tone: "neutral", status: "NO_RANGE", label: "No reference range" },
    ] as const
  ).filter((l) => tones.has(l.tone));
  const shownRange = fmtRange(shown?.appliedRange ?? bandRange, displayFactor);

  function selectWindow(k: WindowKey) {
    if (k === win) return;
    setDrawFast(true);
    setHover(null);
    setWin(k);
  }

  function scrubTo(clientX: number, target: SVGSVGElement) {
    if (data.length === 0) return;
    const rect = target.getBoundingClientRect();
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
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (data.length === 0) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -1 : 1;
      const cur = hover ?? data.length - 1;
      setHover(Math.min(data.length - 1, Math.max(0, cur + step)));
    } else if (e.key === "Escape") {
      setHover(null);
    }
  }

  if (!latest) return null;

  return (
    <div>
      {/* Reading block */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-[0.8125rem] text-ink-3">
            {scrubbed ? (
              <>
                {formatDate(shown.date)}
                {shown.labName ? ` · ${shown.labName}` : ""}
              </>
            ) : (
              <>Latest result · {formatDate(latest.date)}</>
            )}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="flex items-baseline gap-2" aria-live="polite">
              <span className="text-[3.25rem] font-medium leading-none tracking-[-0.035em] text-ink">
                {toDisplay(shown.value)}
              </span>
              <span className="unit text-[0.875rem]">{unit}</span>
            </p>
            <StatusBadge status={shown.status} />
          </div>
          <p className="mt-3 text-[0.8125rem] text-ink-2">
            {delta != null && prev ? (
              <>
                <span className="tnum font-medium text-ink">
                  {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"}{" "}
                  {formatDelta(delta / displayFactor, shown.value / displayFactor)} {unit}
                </span>{" "}
                since {formatDate(prev.date)}
              </>
            ) : (
              <>First recorded value</>
            )}
            {shownRange && (
              <span className="text-ink-3">
                {" "}
                · reference {shownRange} {unit}
              </span>
            )}
          </p>
          {bandRange && (bandRange.min != null || bandRange.max != null) && (
            <RangeBar
              value={shown.value}
              min={bandRange.min ?? undefined}
              max={bandRange.max ?? undefined}
              status={shown.status}
              displayFactor={displayFactor}
              labels
              className="mt-4 max-w-64"
            />
          )}
        </div>

        <div className="seg" role="group" aria-label="Time range">
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
      </div>

      {/* The chart */}
      <figure
        ref={wrapRef as React.RefObject<HTMLElement>}
        className="mt-5"
      >
        {data.length === 0 ? (
          <p className="card-inset px-4 py-10 text-center text-sm text-ink-3">
            No results in this window.
          </p>
        ) : (
          <svg
            role="img"
            aria-label={`${name} over time: ${data.length} measurements, latest ${toDisplay(latest.value)} ${unit} (${STATUS_LABEL[latest.status]})${target ? `, reference range ${target} ${unit}` : ""}`}
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full cursor-crosshair touch-pan-y select-none rounded-lg"
            tabIndex={0}
            onPointerMove={(e) => scrubTo(e.clientX, e.currentTarget)}
            onPointerDown={(e) => scrubTo(e.clientX, e.currentTarget)}
            onPointerLeave={() => setHover(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setHover(null)}
          >
            {/* Grid: solid hairlines at round values */}
            {yTicks.map((t) => (
              <g key={`y${t.label}`}>
                <line
                  x1={M.l}
                  x2={W - M.r}
                  y1={y(t.value)}
                  y2={y(t.value)}
                  stroke="var(--chart-grid)"
                />
                <text
                  x={M.l - 10}
                  y={y(t.value) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--ink-3)"
                  className="tnum"
                >
                  {t.label}
                </text>
              </g>
            ))}

            {/* Reference range: a wash with its limits ruled in */}
            {band && (
              <g>
                <rect
                  x={M.l}
                  y={band.top}
                  width={plotW}
                  height={Math.max(0, band.bottom - band.top)}
                  fill="var(--in-range)"
                  opacity={0.1}
                />
                {band.hasMax && (
                  <line
                    x1={M.l}
                    x2={W - M.r}
                    y1={band.top}
                    y2={band.top}
                    stroke="var(--in-range)"
                    strokeOpacity={0.5}
                  />
                )}
                {band.hasMin && (
                  <line
                    x1={M.l}
                    x2={W - M.r}
                    y1={band.bottom}
                    y2={band.bottom}
                    stroke="var(--in-range)"
                    strokeOpacity={0.5}
                  />
                )}
              </g>
            )}
            {/* Faint dual bands when sex is OTHER and ranges are sex-specific */}
            {!band &&
              (sexBands ?? []).map((b, i) => (
                <rect
                  key={i}
                  x={M.l}
                  y={Math.min(y(b.min ?? domain.min), y(b.max ?? domain.max))}
                  width={plotW}
                  height={Math.abs(y(b.min ?? domain.min) - y(b.max ?? domain.max))}
                  fill="var(--ink)"
                  opacity={0.04}
                />
              ))}

            {/* Baseline + time axis */}
            <line
              x1={M.l}
              x2={W - M.r}
              y1={H - M.b}
              y2={H - M.b}
              stroke="var(--chart-axis)"
            />
            <g opacity={scrubbed ? 0.25 : 1}>
              {xTicks.map((t) => (
                <text
                  key={t.ts}
                  x={x(t.ts)}
                  y={H - 9}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--ink-3)"
                  className="tnum"
                >
                  {t.label}
                </text>
              ))}
            </g>

            {/* Life events: a thin rule with its label at the top */}
            {visibleEvents.map((e) => {
              const ex = x(e.ts);
              const labelY = M.t - 6 - (labelRows - 1 - e.row) * 16;
              return (
                <g key={e.id}>
                  <line
                    x1={ex}
                    x2={ex}
                    y1={e.row >= 0 ? labelY - 10 : M.t}
                    y2={H - M.b}
                    stroke="var(--chart-axis)"
                  />
                  {e.row >= 0 && (
                    <text
                      x={e.flip ? ex - 6 : ex + 6}
                      y={labelY}
                      textAnchor={e.flip ? "end" : "start"}
                      fontSize={11}
                      fill="var(--ink-2)"
                    >
                      {e.text}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Crosshair + date under the pointer */}
            {scrubbed && (
              <g>
                <line
                  x1={x(shown.ts)}
                  x2={x(shown.ts)}
                  y1={M.t}
                  y2={H - M.b}
                  stroke="var(--rule)"
                />
                <text
                  x={Math.min(W - M.r - 36, Math.max(M.l + 36, x(shown.ts)))}
                  y={H - 9}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={500}
                  fill="var(--ink)"
                  className="tnum"
                >
                  {formatDate(shown.date)}
                </text>
              </g>
            )}

            {/* Line + status dots — keyed by window so the draw re-runs */}
            <g key={win}>
              {data.length > 1 && (
                <polyline
                  points={data.map((p) => `${x(p.ts).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke="var(--chart-line)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pathLength={1}
                  className={cn("mk-line", drawFast && "mk-line--fast")}
                />
              )}
              {data.map((p, i) => {
                const last = i === data.length - 1;
                const active = scrubbed && hover === i;
                const delay = drawFast
                  ? 60 + (i * 300) / Math.max(1, data.length - 1)
                  : 150 + (i * 700) / Math.max(1, data.length - 1);
                return (
                  <g key={p.resultId} transform={`translate(${x(p.ts).toFixed(1)} ${y(p.value).toFixed(1)})`}>
                    <PointMark
                      status={p.status}
                      size={active ? 8 : last ? 7 : 6}
                      delay={delay}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
        )}
        {/* Legend: the band, then one entry per status that appears */}
        {data.length > 0 && (
          <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-3">
            {target && (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-2.5 w-4 rounded-[3px] border border-in-range/50 bg-in-range/10"
                />
                Reference range {target} {unit}
              </span>
            )}
            {legend.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <StatusGlyph status={l.status} />
                {l.label}
              </span>
            ))}
          </figcaption>
        )}
      </figure>
    </div>
  );
}
