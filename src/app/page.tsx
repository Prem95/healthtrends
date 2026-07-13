"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Logo } from "@/components/brand/logo";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";
import { cn } from "@/lib/utils";

const GREEN = "var(--in-range)";
const YELLOW = "var(--borderline)";
const RED = "var(--out)";

/* --- primitives --- */
function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", inView && "is-visible", className)}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1300;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      // linear count (count-ups and the marquee are the only linear motion)
      setN(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref} className="tnum">
      {n}
      {suffix}
    </span>
  );
}

/* --- motion primitives --- */
/* The one easing curve, everywhere: expo-out. Nothing bounces or overshoots. */
const EASE_OUT_CUBIC = [0.22, 1, 0.36, 1] as const;

/* Scroll-scrubbed entrance: element slides from (x, y) to rest as it crosses
   the lower half of the viewport. Motion-driven, so it works in every
   browser (the CSS view-timeline version was Chromium-only). */
function ScrubIn({
  children,
  x = 0,
  y = 0,
  className,
}: {
  children: React.ReactNode;
  x?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 97%", "start 55%"],
  });
  const mx = useTransform(scrollYProgress, [0, 1], [x, 0]);
  const my = useTransform(scrollYProgress, [0, 1], [y, 0]);
  const op = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={reduce ? undefined : { x: mx, y: my, opacity: op }}
    >
      {children}
    </motion.div>
  );
}

/* Scroll-scrubbed parallax layer (Tier A: position-linked, reversible).
   Damped with a spring: the lagged settle is most of the "expensive" feel —
   raw scroll mapping reads cheap. */
function Parallax({
  children,
  amount = 30,
  className,
}: {
  children: React.ReactNode;
  amount?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  const y = useSpring(raw, { stiffness: 120, damping: 28, mass: 0.6 });
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/* Hero headline: hand-broken lines (mask per LINE, not per word or block —
   line breaks land on phrase boundaries, never wherever the container wraps). */
const H1_LINES: { t: string; em?: boolean }[] = [
  { t: "See how your body" },
  { t: "has changed" },
  { t: "over the years.", em: true },
];

/* Line-mask headline block: each line in its own overflow-hidden wrapper,
   sliding up 0.9s expo-out, staggered 100ms. Fires on viewport entry, once. */
function MaskLines({
  lines,
  className,
  delay = 0,
  as: Tag = "h2",
}: {
  lines: { t: string; em?: boolean }[];
  className?: string;
  delay?: number;
  as?: "h1" | "h2";
}) {
  const reduce = useReducedMotion();
  const { ref, inView } = useInView<HTMLHeadingElement>(0.4);
  return (
    <Tag ref={ref} className={className}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <span
            className={cn("block", l.em && "em")}
            style={{
              transform: reduce || inView ? "none" : "translateY(112%)",
              transition: reduce
                ? "none"
                : `transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay + i * 100}ms`,
            }}
          >
            {l.t}
          </span>
        </span>
      ))}
    </Tag>
  );
}

/* 3-beat hero entry: eyebrow leads (~150ms before the headline), body copy
   and CTAs trail. Same beat order used site-wide. */
const HERO_ITEM: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT_CUBIC, delay },
  }),
};

/* --- shared status semantics: colour of a reading -> pill --- */
function pillFor(c: string) {
  if (c === GREEN)
    return { label: "In range", bg: "var(--in-range-soft)", fg: "var(--in-range)" };
  if (c === YELLOW)
    return {
      label: "Near a boundary",
      bg: "var(--borderline-soft)",
      fg: "var(--borderline)",
    };
  return { label: "Out of range", bg: "var(--out-soft)", fg: "var(--au-out)" };
}

/* --- demo datasets: one story per marker --- */
type TrendPoint = { y: string; v: number; c: string };

// LDL drifting out of range: the cautionary tale (hero + story section).
const DEMO: TrendPoint[] = [
  { y: "'19", v: 96, c: GREEN },
  { y: "'20", v: 105, c: GREEN },
  { y: "'21", v: 119, c: GREEN },
  { y: "'22", v: 131, c: YELLOW },
  { y: "'23", v: 139, c: YELLOW },
  { y: "'24", v: 152, c: RED },
  { y: "'25", v: 161, c: RED },
  { y: "'26", v: 168, c: RED },
];

// Triglycerides walked back into range: the turnaround tale.
const TRIG: TrendPoint[] = [
  { y: "'19", v: 210, c: RED },
  { y: "'20", v: 195, c: RED },
  { y: "'21", v: 178, c: YELLOW },
  { y: "'22", v: 162, c: YELLOW },
  { y: "'23", v: 148, c: YELLOW },
  { y: "'24", v: 130, c: GREEN },
  { y: "'25", v: 112, c: GREEN },
  { y: "'26", v: 98, c: GREEN },
];

// HbA1c caught early and turned around before it settled out of range.
const A1C: TrendPoint[] = [
  { y: "'19", v: 5.4, c: GREEN },
  { y: "'20", v: 5.6, c: YELLOW },
  { y: "'21", v: 5.9, c: YELLOW },
  { y: "'22", v: 6.2, c: YELLOW },
  { y: "'23", v: 6.4, c: RED },
  { y: "'24", v: 6.1, c: YELLOW },
  { y: "'25", v: 5.8, c: YELLOW },
  { y: "'26", v: 5.6, c: YELLOW },
];

/* --- scrub: hover or touch a chart and read any year --- */
function useScrub(data: TrendPoint[]) {
  const [idx, setIdx] = useState<number | null>(null);
  const i = idx == null || idx >= data.length ? data.length - 1 : idx;
  return { idx, setIdx, i, active: data[i] };
}

function deltaPct(data: TrendPoint[], i: number) {
  return Math.round(((data[i].v - data[0].v) / data[0].v) * 100);
}

/* Header block shared by the hero panel and the product window: the big
   number, the change since the first test, and the status pill, all of which
   re-derive from wherever the reader is scrubbing on the chart. */
function ScrubReadout({
  data,
  idx,
  i,
  digits = 0,
  size = "md",
}: {
  data: TrendPoint[];
  idx: number | null;
  i: number;
  digits?: number;
  size?: "md" | "lg";
}) {
  const active = data[i];
  const pill = pillFor(active.c);
  const d = deltaPct(data, i);
  const DeltaArrow = d >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p
          className={cn(
            "au-num leading-none text-ink",
            size === "lg" ? "text-5xl" : "text-4xl",
          )}
        >
          {active.v.toFixed(digits)}
        </p>
        <p
          className="mt-1.5 flex items-center gap-1 text-sm font-medium"
          style={{ color: pill.fg }}
        >
          <DeltaArrow className="size-4" />
          {d >= 0 ? "+" : ""}
          {d}%{" "}
          {idx == null ? "in 8 years" : `by 20${active.y.slice(1)}`}
        </p>
      </div>
      <span
        className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
        style={{ backgroundColor: pill.bg, color: pill.fg }}
      >
        {pill.label}
      </span>
    </div>
  );
}

/* --- feature-card visuals --- */

// Inline sparkline used by the family tile and the marker wall.
function sparkPts(values: number[], w = 80, h = 24) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = 2 + (i / (values.length - 1)) * (w - 4);
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x},${y}`;
    })
    .join(" ");
}

// "Everyone you look after": profiles side by side, each with its own line.
function FamilyPanel() {
  const people: {
    name: string;
    results: number;
    vals: number[];
    status: string;
    color: string;
  }[] = [
    {
      name: "You",
      results: 34,
      vals: [72, 74, 71, 76, 75, 78],
      status: "All in range",
      color: GREEN,
    },
    {
      name: "Dad",
      results: 21,
      vals: [130, 142, 151, 149, 158, 166],
      status: "2 need a look",
      color: "var(--au-out)",
    },
    {
      name: "Maya",
      results: 8,
      vals: [28, 31, 29, 34, 33, 36],
      status: "1 near a boundary",
      color: YELLOW,
    },
  ];
  return (
    <div className="flex flex-col divide-y divide-line border-t border-line">
      {people.map((p) => (
        <div key={p.name} className="flex items-center gap-3 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper-3 font-display text-sm text-ink">
            {p.name[0]}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">{p.name}</span>
            <span className="block text-xs text-ink-3 tnum">
              {p.results} results
            </span>
          </span>
          <svg
            viewBox="0 0 80 24"
            className="ml-auto h-6 w-20 shrink-0"
            aria-hidden
          >
            <polyline
              points={sparkPts(p.vals)}
              fill="none"
              stroke="var(--brand)"
              strokeOpacity="0.6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="w-[7.5rem] shrink-0 text-right text-xs font-medium"
            style={{ color: p.color }}
          >
            {p.status}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Same semantics as the product: red clear of the band, amber near a
   boundary (just inside or just outside), green comfortably in range. */
const RECOVER_YEARS = ["'19", "'20", "'21", "'22", "'23", "'24", "'25", "'26"];
const RECOVER_START = [18, 21, 24, 31, 38, 42, 44, 46];
const RECOVER_LO = 30;
const RECOVER_HI = 50;
const RECOVER_BAND = RECOVER_HI - RECOVER_LO;

function recoverColor(v: number) {
  if (v < RECOVER_LO) return v >= RECOVER_LO - 0.35 * RECOVER_BAND ? YELLOW : RED;
  if (v > RECOVER_HI) return v <= RECOVER_HI + 0.35 * RECOVER_BAND ? YELLOW : RED;
  if (v - RECOVER_LO < 0.12 * RECOVER_BAND || RECOVER_HI - v < 0.12 * RECOVER_BAND)
    return YELLOW;
  return GREEN;
}

type DragDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TrendPoint;
  draggedIndex: number | null;
  report: (index: number, cy: number, v: number) => void;
  onDragStart: (index: number, clientY: number) => void;
  onDragMove: (clientY: number) => void;
  onDragEnd: () => void;
  onNudge: (index: number, delta: number) => void;
};

/* A reading you can pick up: r14 invisible hit area over the visible dot,
   vertical pointer drag plus arrow keys, value label while held. */
function DragDot({
  cx,
  cy,
  index,
  payload,
  draggedIndex,
  report,
  onDragStart,
  onDragMove,
  onDragEnd,
  onNudge,
}: DragDotProps) {
  if (cx == null || cy == null || index == null || !payload) return null;
  report(index, cy, payload.v);
  const held = draggedIndex === index;
  return (
    <g>
      {held && (
        <text
          x={cx}
          y={cy - 13}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--ink)"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {payload.v}
        </text>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={held ? 5.5 : 4}
        fill="var(--paper)"
        stroke={payload.c}
        strokeWidth={2.25}
      />
      <circle
        cx={cx}
        cy={cy}
        r={14}
        fill="transparent"
        role="slider"
        tabIndex={0}
        aria-label={`Vitamin D reading for ${payload.y}`}
        aria-valuemin={12}
        aria-valuemax={58}
        aria-valuenow={payload.v}
        style={{
          cursor: held ? "ns-resize" : "grab",
          touchAction: "none",
          outline: "none",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          onDragStart(index, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) onDragMove(e.clientY);
        }}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const step = e.shiftKey ? 5 : 1;
            onNudge(index, e.key === "ArrowUp" ? step : -step);
          }
        }}
      />
    </g>
  );
}

/* The bento tile's live chart: header pill, draggable readings, drag hint. */
function RecoveryDemo() {
  const [values, setValues] = useState<number[]>(RECOVER_START);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  // Pixel geometry of rendered dots, reported on every render, so a drag can
  // convert pointer movement to value units exactly (recharts owns the scale).
  const geom = useRef(new Map<number, { cy: number; v: number }>());
  const drag = useRef<{ idx: number; startY: number; startV: number; scale: number } | null>(
    null,
  );

  const data = values.map((v, i) => ({ y: RECOVER_YEARS[i], v, c: recoverColor(v) }));

  const report = (i: number, cy: number, v: number) => {
    geom.current.set(i, { cy, v });
  };
  const setValue = (idx: number, v: number) =>
    setValues((prev) =>
      prev.map((p, i) => (i === idx ? Math.min(58, Math.max(12, Math.round(v))) : p)),
    );

  const onDragStart = (idx: number, clientY: number) => {
    setTouched(true);
    setDragIdx(idx);
    // units-per-pixel from two rendered dots with distinct values; falls back
    // to domain-span / plot-height if every reading has been dragged level
    let scale = 50 / 150;
    const me = geom.current.get(idx);
    const other = [...geom.current.entries()].find(([i, g]) => i !== idx && g.v !== me?.v);
    if (me && other) scale = Math.abs((me.v - other[1].v) / (other[1].cy - me.cy));
    drag.current = { idx, startY: clientY, startV: values[idx], scale };
  };
  const onDragMove = (clientY: number) => {
    const d = drag.current;
    if (d) setValue(d.idx, d.startV + (d.startY - clientY) * d.scale);
  };
  const onDragEnd = () => {
    drag.current = null;
    setDragIdx(null);
  };
  const onNudge = (idx: number, delta: number) => {
    setTouched(true);
    setValue(idx, values[idx] + delta);
  };

  const lastColor = recoverColor(values[values.length - 1]);
  const pill =
    lastColor === GREEN
      ? { label: "Back in range", bg: "var(--in-range-soft)", fg: "var(--in-range)" }
      : pillFor(lastColor);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between px-1">
        <p className="au-eyebrow">Vitamin D · ng/mL</p>
        <span
          className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium transition-colors"
          style={{ backgroundColor: pill.bg, color: pill.fg }}
        >
          {pill.label}
        </span>
      </div>
      <div className="mt-1 h-[196px] w-full">
        <TrendChart
          data={data}
          domain={[10, 60]}
          band={[RECOVER_LO, RECOVER_HI]}
          annotation={{ x: "'21", label: "started Vit D" }}
          height={196}
          yWidth={36}
          animate={!touched}
          renderDot={
            <DragDot
              draggedIndex={dragIdx}
              report={report}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
              onNudge={onNudge}
            />
          }
        />
      </div>
      <p className="mt-1 px-1 text-xs text-ink-3">
        Try it — drag a reading up or down and watch its colour follow the range.
      </p>
    </div>
  );
}

type DemoDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: TrendPoint;
  activeIndex?: number | null;
};
function DemoDot({ cx, cy, index, payload, activeIndex = null }: DemoDotProps) {
  if (cx == null || cy == null || !payload) return null;
  const active = index != null && index === activeIndex;
  return (
    <g>
      {active && <circle cx={cx} cy={cy} r={9} fill={payload.c} opacity={0.18} />}
      <circle
        cx={cx}
        cy={cy}
        r={active ? 5.5 : 4}
        fill="var(--paper)"
        stroke={payload.c}
        strokeWidth={2.25}
      />
    </g>
  );
}

const renderNoTooltip = () => null;

// Shared editorial area-chart: soft gradient fill under the line, status-
// coloured readings, a shaded normal-range band, and an optional life-event
// annotation. Pass `onScrub` to make it readable by hover or touch: a dashed
// time cursor follows the pointer and the hovered reading is highlighted.
function TrendChart({
  data,
  domain,
  band,
  height,
  animate = true,
  annotation,
  yWidth = 40,
  tickFontSize = 11,
  renderDot,
  onScrub,
  scrubIndex,
}: {
  data: TrendPoint[];
  domain: [number, number];
  band: [number, number];
  height: number;
  animate?: boolean;
  annotation?: { x: string; label: string };
  yWidth?: number;
  tickFontSize?: number;
  /** Custom dot element (e.g. a draggable reading); defaults to the static dot. */
  renderDot?: React.ReactElement;
  onScrub?: (index: number | null) => void;
  scrubIndex?: number | null;
}) {
  const readIndex = (s: { activeTooltipIndex?: number | string | null } | null) => {
    const raw = s?.activeTooltipIndex;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    onScrub?.(Number.isFinite(n) ? n : null);
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 16, right: 10, bottom: 0, left: -14 }}
        onMouseMove={onScrub ? readIndex : undefined}
        onMouseLeave={onScrub ? () => onScrub(null) : undefined}
        onTouchMove={onScrub ? readIndex : undefined}
        onTouchEnd={onScrub ? () => onScrub(null) : undefined}
      >
        <ReferenceArea
          y1={band[0]}
          y2={band[1]}
          fill={GREEN}
          fillOpacity={0.1}
          stroke={GREEN}
          strokeOpacity={0.2}
        />
        {annotation ? (
          <ReferenceLine
            x={annotation.x}
            stroke="var(--ink-3)"
            strokeDasharray="3 3"
            strokeOpacity={0.55}
            label={{
              value: annotation.label,
              position: "insideTopLeft",
              fill: "var(--ink-3)",
              fontSize: 10.5,
              offset: 8,
            }}
          />
        ) : null}
        <XAxis
          dataKey="y"
          tick={{ fill: "var(--ink-3)", fontSize: tickFontSize }}
          axisLine={{ stroke: "var(--line-strong)" }}
          tickLine={false}
          padding={{ left: 10, right: 10 }}
        />
        <YAxis
          domain={domain}
          tick={{ fill: "var(--ink-3)", fontSize: tickFontSize }}
          axisLine={false}
          tickLine={false}
          width={yWidth}
        />
        {onScrub ? (
          <Tooltip
            content={renderNoTooltip}
            cursor={{ stroke: "var(--line-strong)", strokeDasharray: "4 4" }}
            isAnimationActive={false}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="v"
          stroke="var(--brand)"
          strokeWidth={2.5}
          fill="var(--brand)"
          fillOpacity={0.06}
          isAnimationActive={animate}
          animationDuration={1500}
          dot={renderDot ?? <DemoDot activeIndex={scrubIndex ?? null} />}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* The product window: marker tabs on top, scrubbable chart below. Switching
   tabs redraws the line; every marker gets its own line, literally. */
const MARKERS = [
  {
    key: "ldl",
    tab: "LDL",
    label: "LDL cholesterol · mg/dL",
    data: DEMO,
    domain: [60, 190] as [number, number],
    band: [40, 130] as [number, number],
    annotation: { x: "'22", label: "left range" },
    digits: 0,
  },
  {
    key: "trig",
    tab: "Triglycerides",
    label: "Triglycerides · mg/dL",
    data: TRIG,
    domain: [60, 230] as [number, number],
    band: [60, 150] as [number, number],
    annotation: { x: "'20", label: "changed diet" },
    digits: 0,
  },
  {
    key: "a1c",
    tab: "HbA1c",
    label: "HbA1c · %",
    data: A1C,
    domain: [5, 7] as [number, number],
    band: [4, 5.7] as [number, number],
    annotation: undefined,
    digits: 1,
  },
];

function ProductWindow() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const [mk, setMk] = useState(0);
  const m = MARKERS[mk];
  const { idx, setIdx, i } = useScrub(m.data);
  return (
    <div ref={ref} className="au-card overflow-hidden rounded-[20px]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-paper-3" />
          <span className="size-2.5 rounded-full bg-paper-3" />
          <span className="size-2.5 rounded-full bg-paper-3" />
        </span>
        <div className="ml-auto flex gap-1">
          {MARKERS.map((mm, mi) => (
            <button
              key={mm.key}
              type="button"
              onClick={() => {
                setMk(mi);
                setIdx(null);
              }}
              className={cn(
                "relative rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                mi === mk
                  ? "border-transparent text-[#f6f8f8]"
                  : "border-line text-ink-2 hover:text-ink",
              )}
            >
              {mi === mk ? (
                <motion.span
                  layoutId="pw-tab-pill"
                  className="absolute inset-0 rounded-full bg-[#0f1a20]"
                  transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
                />
              ) : null}
              <span className="relative">{mm.tab}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={m.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: EASE_OUT_CUBIC }}
        >
        <p className="au-eyebrow">{m.label}</p>
        <div className="mt-2.5">
          <ScrubReadout data={m.data} idx={idx} i={i} digits={m.digits} />
        </div>
        <div className="mt-4 h-52 w-full">
          <TrendChart
            data={m.data}
            domain={m.domain}
            band={m.band}
            height={208}
            animate={inView}
            annotation={m.annotation}
            yWidth={44}
            onScrub={setIdx}
            scrubIndex={idx}
          />
        </div>
        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// The hero visual: one biomarker read as a single line across eight years,
// and it reads back. Move along the chart and the number, the change and the
// status pill re-derive from whichever year you are over.
function HeroPanel() {
  const { ref, inView } = useInView<HTMLDivElement>(0.25);
  const { idx, setIdx, i, active } = useScrub(DEMO);
  // One guided sweep across the years after the line draws, so the chart
  // demonstrates its own interaction. Any real hover takes over immediately.
  const sweepStop = useRef(false);
  useEffect(() => {
    if (!inView || sweepStop.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now() + 1700;
    const dur = 2000;
    const tick = (t: number) => {
      if (sweepStop.current) return;
      if (t >= start) {
        const p = Math.min(1, (t - start) / dur);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        setIdx(
          p >= 1 ? null : Math.min(DEMO.length - 1, Math.floor(e * DEMO.length)),
        );
        if (p >= 1) return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, setIdx]);
  const scrub = (v: number | null) => {
    sweepStop.current = true;
    setIdx(v);
  };
  const legend: [string, string][] = [
    ["in range", GREEN],
    ["borderline", YELLOW],
    ["out of range", RED],
  ];
  const stats: [string, string][] = [
    ["First test", "96 · 2019"],
    ["Latest", "168 · 2026"],
    ["Your range", "40-130"],
  ];
  return (
    <div ref={ref} className="au-glass overflow-hidden rounded-[20px]">
      <div className="px-6 pt-6">
        <p className="au-eyebrow">
          LDL cholesterol · mg/dL
          <span className="ml-2 normal-case tracking-normal text-ink-3">
            {idx == null ? "" : `20${active.y.slice(1)}`}
          </span>
        </p>
        <div className="mt-2.5">
          <ScrubReadout data={DEMO} idx={idx} i={i} size="lg" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden border-y border-line bg-line/60">
        {stats.map(([label, val]) => (
          <div key={label} className="bg-white/40 px-6 py-3">
            <p className="au-mono text-[0.6875rem] tracking-[0.08em] text-ink-3">
              {label}
            </p>
            <p className="au-num mt-0.5 text-sm text-ink">{val}</p>
          </div>
        ))}
      </div>
      <div className="h-[236px] w-full pr-3 pt-1">
        <TrendChart
          data={DEMO}
          domain={[60, 190]}
          band={[40, 130]}
          height={236}
          animate={inView}
          annotation={{ x: "'22", label: "left range" }}
          yWidth={44}
          onScrub={scrub}
          scrubIndex={idx}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-line px-6 py-3.5 text-xs text-ink-3">
        {legend.map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
        <span className="ml-auto hidden md:inline">
          Move along the line to read any year
        </span>
        <span className="ml-auto tnum md:hidden">8 tests · 2019-2026</span>
      </div>
    </div>
  );
}

/* --- scrollytelling: reports pile up, become trends, get flagged --- */
const STORY_STEPS: { title: string; body: string }[] = [
  {
    title: "Gather the reports you already have.",
    body: "Every checkup leaves a lab report behind. Bring the years of them into one place, a minute each.",
  },
  {
    title: "Together, they show your body changing.",
    body: "Reports become trends. Did the workouts help? Is the diet working? Twelve months answer what one report cannot.",
  },
  {
    title: "The risky ones get flagged early.",
    body: "Markers drifting toward trouble are called out first, so your next doctor's visit starts with the right question.",
  },
];

/* Stage 0: the raw material. Three dated lab reports fanned like the pile
   on everyone's desk, values consistent with the trend tiles they feed. */
const REPORTS: { lab: string; date: string; rows: [string, string, string][] }[] = [
  {
    lab: "Oakview Diagnostics",
    date: "Feb 2021",
    rows: [
      ["LDL cholesterol", "119", "mg/dL"],
      ["HbA1c", "5.9", "%"],
      ["Vitamin D", "24", "ng/mL"],
    ],
  },
  {
    lab: "Meridian Labs",
    date: "Nov 2023",
    rows: [
      ["LDL cholesterol", "139", "mg/dL"],
      ["Triglycerides", "148", "mg/dL"],
      ["Vitamin D", "38", "ng/mL"],
    ],
  },
  {
    lab: "Central Pathology",
    date: "Jan 2026",
    rows: [
      ["LDL cholesterol", "168", "mg/dL"],
      ["HbA1c", "5.6", "%"],
      ["Triglycerides", "98", "mg/dL"],
    ],
  },
];

const REPORT_POSE = [
  { left: 0, top: 0, rotate: -3 },
  { left: 26, top: 40, rotate: 1.5 },
  { left: 52, top: 80, rotate: 4 },
];

// Where each card flies when the pile becomes the grid: dealt outward,
// flattened and shrunk, as if handed to the charts taking its place.
const REPORT_DEAL = [
  { x: -70, y: -40 },
  { x: 70, y: -10 },
  { x: -26, y: 58 },
];

/* Springs in with a slight overshoot, deals out on the house ease. */
const REPORT_CARD: Variants = {
  hidden: (i: number) => ({
    opacity: 0,
    x: 0,
    y: 18,
    scale: 1,
    rotate: REPORT_POSE[i].rotate,
  }),
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotate: REPORT_POSE[i].rotate,
    transition: { type: "spring", duration: 0.65, bounce: 0.32, delay: i * 0.12 },
  }),
  deal: (i: number) => ({
    opacity: 0,
    x: REPORT_DEAL[i].x,
    y: REPORT_DEAL[i].y,
    scale: 0.55,
    rotate: 0,
    transition: { duration: 0.5, ease: EASE_OUT_CUBIC, delay: i * 0.06 },
  }),
};

function ReportStack({ show, exit }: { show: boolean; exit: boolean }) {
  const reduce = useReducedMotion();
  const state = exit ? "deal" : show ? "show" : "hidden";
  return (
    <div className="relative mx-auto h-[236px] w-[272px]">
      {REPORTS.map((r, i) => (
        <motion.div
          key={r.lab}
          custom={i}
          variants={REPORT_CARD}
          initial={reduce ? false : "hidden"}
          animate={state}
          transition={reduce ? { duration: 0 } : undefined}
          className="absolute w-[220px] rounded-2xl border border-line bg-paper p-3.5"
          style={{
            left: REPORT_POSE[i].left,
            top: REPORT_POSE[i].top,
          }}
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5">
            <span className="truncate text-xs font-medium text-ink">{r.lab}</span>
            <span className="shrink-0 text-[0.68rem] text-ink-3">{r.date}</span>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {r.rows.map(([name, val, unit]) => (
              <div key={name} className="flex items-baseline justify-between py-1.5">
                <span className="truncate text-[0.72rem] text-ink-2">{name}</span>
                <span className="shrink-0 pl-2 text-[0.72rem]">
                  <span className="au-num text-ink">{val}</span>{" "}
                  <span className="text-ink-3">{unit}</span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* Stages 1-2: four markers as trend tiles. Lines draw on together; at the
   flag stage the risky two are called out and the healthy two step back. */
/* Grid order starts casual; at the flag stage the array re-sorts worst
   first (exactly how the dashboard sorts) and Motion's layout animation
   carries every tile to its new cell on a spring. */
const MINIS: {
  name: string;
  vals: number[];
  cols: string[];
  note?: { i: number; label: string };
  flag?: { label: string; color: string; soft: string; sev: number };
}[] = [
  {
    name: "Triglycerides",
    vals: [210, 195, 178, 162, 148, 130, 98],
    cols: [RED, RED, YELLOW, YELLOW, YELLOW, GREEN, GREEN],
    note: { i: 2, label: "started workouts" },
  },
  {
    name: "LDL",
    vals: [96, 105, 119, 131, 139, 152, 168],
    cols: [GREEN, GREEN, GREEN, YELLOW, YELLOW, RED, RED],
    flag: {
      label: "Needs a look",
      color: "var(--au-out)",
      soft: "var(--out-soft)",
      sev: 2,
    },
  },
  {
    name: "Vitamin D",
    vals: [18, 21, 24, 31, 38, 42, 46],
    cols: [RED, YELLOW, YELLOW, YELLOW, GREEN, GREEN, GREEN],
  },
  {
    name: "HbA1c",
    vals: [5.4, 5.6, 5.9, 6.2, 6.4, 5.8, 5.6],
    cols: [GREEN, YELLOW, YELLOW, YELLOW, RED, YELLOW, YELLOW],
    flag: {
      label: "Drifting",
      color: "var(--borderline)",
      soft: "var(--borderline-soft)",
      sev: 1,
    },
  },
];

function miniGeom(vals: number[], w = 200, h = 64) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const X = (i: number) => 8 + (i / (vals.length - 1)) * (w - 16);
  const Y = (v: number) => h - 10 - ((v - min) / span) * (h - 22);
  return { X, Y, pts: vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ") };
}

function MiniTrendGrid({ stage }: { stage: number }) {
  const reduce = useReducedMotion();
  const list =
    stage >= 2
      ? [...MINIS].sort((a, b) => (b.flag?.sev ?? 0) - (a.flag?.sev ?? 0))
      : MINIS;
  return (
    <div className={cn("grid grid-cols-2 gap-2.5", stage >= 1 && "is-drawn")}>
      {list.map((m) => {
        const ti = MINIS.indexOf(m);
        const { X, pts } = miniGeom(m.vals);
        const flagged = stage >= 2 && Boolean(m.flag);
        return (
          <motion.div
            layout
            key={m.name}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", duration: 0.65, bounce: 0.2 }
            }
            className="relative rounded-2xl border bg-paper p-3 transition-[opacity,border-color,box-shadow] duration-500 motion-reduce:transition-none"
            style={{
              borderColor: flagged ? m.flag!.color : "var(--line)",
              boxShadow: flagged ? `0 0 0 3px ${m.flag!.soft}` : "none",
              opacity: stage >= 2 && !m.flag ? 0.55 : 1,
              zIndex: m.flag ? 2 : 1,
            }}
          >
            <div className="flex min-h-5 items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-ink">{m.name}</p>
              <AnimatePresence>
                {flagged ? (
                  <motion.span
                    initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.45, bounce: 0.4 }}
                    className="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium"
                    style={{ backgroundColor: m.flag!.soft, color: m.flag!.color }}
                  >
                    {m.flag!.label}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <svg viewBox="0 0 200 64" className="mt-1.5 w-full" aria-hidden>
              {m.note ? (
                <g opacity={0.8}>
                  <line
                    x1={X(m.note.i)}
                    x2={X(m.note.i)}
                    y1={8}
                    y2={56}
                    stroke="var(--ink-3)"
                    strokeDasharray="3 3"
                    strokeOpacity={0.55}
                  />
                  <text x={X(m.note.i) + 5} y={14} fontSize={9} fill="var(--ink-3)">
                    {m.note.label}
                  </text>
                </g>
              ) : null}
              <polyline
                className="draw-line"
                pathLength={1}
                points={pts}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transitionDelay: `${ti * 110}ms` }}
              />
              {m.vals.map((v, i) => {
                const { X: gx, Y: gy } = miniGeom(m.vals);
                return (
                  <circle
                    key={i}
                    className="draw-dot"
                    cx={gx(i)}
                    cy={gy(v)}
                    r={2.6}
                    fill={m.cols[i]}
                    style={{
                      ["--dot-delay" as string]: `${400 + ti * 110 + i * 70}ms`,
                    }}
                  />
                );
              })}
            </svg>
          </motion.div>
        );
      })}
    </div>
  );
}

/* The sticky panel body: the report pile cross-fades into the trend grid.
   The grid layer (hidden, not removed) defines the panel height so the
   swap never causes a jump. */
function StoryPanel({ stage, inView }: { stage: number; inView: boolean }) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        <ReportStack show={inView && stage === 0} exit={stage >= 1} />
      </div>
      <div
        className="st-fade"
        style={{
          opacity: stage >= 1 ? 1 : 0,
          transform: stage >= 1 ? "none" : "translateY(10px)",
        }}
      >
        <MiniTrendGrid stage={stage} />
      </div>
    </div>
  );
}

function ScrollStory() {
  const [stage, setStage] = useState(0);
  const stepsRef = useRef<HTMLDivElement>(null);
  const { ref: panelRef, inView } = useInView<HTMLDivElement>(0.35);
  useEffect(() => {
    const root = stepsRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStage(Number((e.target as HTMLElement).dataset.step));
          }
        }
      },
      { rootMargin: "-42% 0px -42% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const pill =
    stage >= 2
      ? { label: "2 flagged early", bg: "var(--out-soft)", fg: "var(--au-out)" }
      : null;

  return (
    <section id="how" className="scroll-mt-20 border-t border-line py-20 sm:py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <ScrubIn y={36}>
          <span className="au-eyebrow">How it works</span>
          <h2 className="au-hl mt-3 max-w-2xl pb-1 text-[clamp(1.9rem,1.2rem+2.4vw,3rem)] leading-[1.12] text-ink">
            One test is a dot. Years of tests are a{" "}
            <span className="em">direction</span>.
          </h2>
        </ScrubIn>

        <div className="mt-12 md:grid md:grid-cols-[0.9fr_1.1fr] md:gap-14">
          {/* The chart panel. Sticky on both breakpoints: pinned under the nav
              on mobile while the steps scroll beneath it, pinned mid-viewport
              in its own column on desktop. */}
          <div className="sticky top-[4.25rem] z-10 md:static md:col-start-2 md:row-start-1">
            <div className="md:sticky md:top-[max(6rem,calc(50vh_-_16rem))]">
              <div ref={panelRef} className="au-card rounded-[20px] p-5 sm:p-6">
                <div className="flex items-center justify-between px-1 pb-3">
                  <p className="au-eyebrow">
                    {stage === 0 ? "Your lab reports" : "Your markers · 8 years"}
                  </p>
                  <span className="flex h-[1.375rem] items-center">
                    <AnimatePresence>
                      {pill ? (
                        <motion.span
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ type: "spring", duration: 0.45, bounce: 0.4 }}
                          className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium"
                          style={{ backgroundColor: pill.bg, color: pill.fg }}
                        >
                          {pill.label}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </div>
                <StoryPanel stage={stage} inView={inView} />
              </div>
            </div>
          </div>

          {/* The narration. Each step drives the chart's stage as it crosses
              the middle of the viewport. */}
          <div ref={stepsRef} className="md:col-start-1 md:row-start-1">
            {STORY_STEPS.map((s, si) => (
              <div
                key={s.title}
                data-step={si}
                className={cn(
                  "flex min-h-[52vh] items-center pt-10 transition-opacity duration-500 md:min-h-[72vh] md:pt-0",
                  stage === si ? "opacity-100" : "opacity-30",
                )}
              >
                <ScrubIn x={-44}>
                  <h3 className="font-display text-2xl leading-snug text-ink md:text-3xl">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-base leading-relaxed text-ink-2 md:text-lg">
                    {s.body}
                  </p>
                </ScrubIn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --- the marker wall: breadth shown, not claimed --- */
const WALL: { n: string; vals: number[] }[] = [
  { n: "LDL", vals: [96, 105, 119, 131, 139, 152, 168] },
  { n: "HDL", vals: [48, 51, 50, 54, 57, 55, 59] },
  { n: "Triglycerides", vals: [210, 195, 178, 162, 148, 130, 98] },
  { n: "HbA1c", vals: [5.4, 5.6, 5.9, 6.2, 6.4, 5.8, 5.6] },
  { n: "Fasting glucose", vals: [88, 92, 97, 101, 99, 96, 94] },
  { n: "TSH", vals: [1.8, 2.1, 2.6, 3.4, 3.1, 2.7, 2.4] },
  { n: "Free T4", vals: [1.1, 1.2, 1.1, 1.0, 1.1, 1.2, 1.2] },
  { n: "Vitamin D", vals: [18, 21, 24, 31, 38, 42, 46] },
  { n: "Vitamin B12", vals: [310, 290, 340, 420, 480, 510, 530] },
  { n: "Ferritin", vals: [12, 18, 25, 34, 48, 60, 72] },
  { n: "Hemoglobin", vals: [13.2, 13.5, 13.1, 13.8, 14.1, 14.0, 14.2] },
  { n: "ALT", vals: [42, 38, 35, 31, 28, 26, 24] },
  { n: "Creatinine", vals: [0.9, 0.92, 0.95, 0.97, 0.94, 0.93, 0.91] },
  { n: "eGFR", vals: [98, 96, 95, 92, 94, 95, 96] },
  { n: "hs-CRP", vals: [3.2, 2.8, 2.1, 1.6, 1.2, 0.9, 0.8] },
  { n: "Uric acid", vals: [7.4, 7.1, 6.8, 6.4, 6.1, 5.9, 5.7] },
];

function MarkerWall() {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  return (
    <section className="border-t border-line py-20 sm:py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <ScrubIn y={48}>
        <div className="au-card au-card--olive relative overflow-hidden rounded-[20px] px-6 py-12 text-ink sm:px-10 md:py-16">
          <div className="relative">
          <span className="au-chip">
            <span className="au-hex" />
            70+ markers
          </span>
          <h2 className="au-hl mt-5 max-w-xl text-[clamp(1.7rem,1.1rem+2.2vw,2.75rem)] leading-[1.14] text-ink">
            Every reading, ready on day one.
          </h2>
          <p className="mt-3 max-w-md text-base text-ink-2">
            Lipids, metabolic, thyroid, vitamins, blood count. Pick a panel,
            type the numbers, done.
          </p>
          <div
            ref={ref}
            className={cn(
              "mt-9 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4",
              inView && "is-drawn",
            )}
          >
            {WALL.map((m, i) => (
              <div
                key={m.n}
                className="transition-[transform,opacity] duration-500 motion-reduce:transition-none"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? undefined : "translateY(20px)",
                  transitionDelay: `${i * 45}ms`,
                  transitionTimingFunction: "var(--au-ease)",
                }}
              >
                <div className="wall-chip rounded-md border border-line bg-paper p-3 transition-[border-color] duration-300 hover:border-brand/60">
                  <p className="au-mono truncate text-[0.7rem] tracking-[0.04em] text-ink-2">
                    {m.n}
                  </p>
                  <svg
                    viewBox="0 0 80 24"
                    className="mt-2 h-6 w-full text-brand"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <polyline
                      className="draw-line"
                      pathLength={1}
                      points={sparkPts(m.vals)}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transitionDelay: `${i * 55}ms` }}
                    />
                  </svg>
                </div>
              </div>
            ))}
            <div
              className="au-mono grid place-items-center rounded-md border border-dashed border-line-strong p-3 text-[0.7rem] tracking-[0.04em] text-ink-3 transition-[transform,opacity] duration-500 motion-reduce:transition-none"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? undefined : "translateY(20px)",
                transitionDelay: `${WALL.length * 45}ms`,
                transitionTimingFunction: "var(--au-ease)",
              }}
            >
              + 54 more
            </div>
          </div>
          </div>
        </div>
        </ScrubIn>
      </div>
    </section>
  );
}

/* --- Alethia button set: mono, arrow-tile primary, light pill, ghost --- */
function ArrowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("au-arrowbtn", className)}>
      {children}
      <span className="au-arrow">→</span>
    </Link>
  );
}

/* --- scroll state for the nav (transparent over the hero, bar on scroll) --- */
function useScrolled(threshold = 16) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}

const NAV_LINKS: [string, string][] = [
  ["How it works", "#how"],
  ["The product", "#product"],
  ["Markers", "#markers"],
  ["Pricing", "#pricing"],
];

function Nav() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  // any nav interaction beyond the top solidifies the bar; an open menu too
  const solid = scrolled || open;
  return (
    <header
      className={cn(
        "sticky top-0 z-30 transition-colors duration-300",
        solid
          ? "border-b border-line bg-page/80 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <div aria-hidden className="au-progress" />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="au-ghost text-[0.75rem]">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="au-ghost hidden text-[0.75rem] sm:inline-flex">
            Sign in
          </Link>
          {/* mobile menu toggle — functional glyph, ≥44px hit area */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center md:hidden"
          >
            <span className="relative block h-3 w-5">
              <span
                className={cn(
                  "absolute left-0 top-0 h-px w-5 bg-ink transition-transform duration-300",
                  open && "translate-y-[6px] rotate-45",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 top-1.5 h-px w-5 bg-ink transition-opacity duration-200",
                  open && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0 left-0 h-px w-5 bg-ink transition-transform duration-300",
                  open && "-translate-y-[5px] -rotate-45",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {/* mobile menu panel */}
      <div
        className={cn(
          "overflow-hidden border-t border-line bg-page/95 backdrop-blur-md transition-[max-height,opacity] duration-300 md:hidden",
          open ? "max-h-80 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col px-5 py-2">
          {NAV_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="au-mono border-b border-line py-3.5 text-[0.8rem] tracking-[0.04em] text-ink-2 transition-colors last:border-0 hover:text-brand"
            >
              {label}
            </a>
          ))}
          <a
            href="/login"
            onClick={() => setOpen(false)}
            className="au-mono py-3.5 text-[0.8rem] tracking-[0.04em] text-ink-2 transition-colors hover:text-brand"
          >
            Sign in
          </a>
        </nav>
      </div>
    </header>
  );
}

/* Media panel: the animated tonal wash + a fade so it dissolves into canvas.
   Reads as living video behind frosted glass without shipping a video asset. */
function Media({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="au-media" />
      {/* flat scrim for text contrast — sections cut hard at their hairline */}
      <div className="absolute inset-0 bg-page/45" />
    </div>
  );
}

/* HERO — load choreography per spec: eyebrow 100ms → headline line-masks from
   250ms (3 lines x 100ms) → frost panel 600ms → body/CTAs → ticker last.
   Total settle ~1.4s. No preloader, no curtain. */
function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Media />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 md:grid-cols-[1.05fr_1fr] md:gap-14 md:pb-32 md:pt-28 lg:gap-20">
        <div className="relative z-10 min-w-0 max-w-xl">
          <motion.span
            className="au-chip"
            variants={HERO_ITEM}
            custom={0.1}
            initial={reduce ? false : "hidden"}
            animate="show"
          >
            <span className="au-hex" />
            Blood-test trends
          </motion.span>
          <MaskLines
            as="h1"
            lines={H1_LINES}
            delay={250}
            className="au-hl mt-5 text-[clamp(2rem,1rem+4.8vw,6rem)] leading-[1.04] tracking-[-0.035em] text-ink"
          />
          <motion.p
            variants={HERO_ITEM}
            custom={0.7}
            initial={reduce ? false : "hidden"}
            animate="show"
            className="mt-6 max-w-md text-lg leading-relaxed text-ink-2"
          >
            Log each result once. bbiom draws every marker as a single
            line across the years, so a decade of blood tests reads at a glance.
          </motion.p>
          <motion.div
            variants={HERO_ITEM}
            custom={0.85}
            initial={reduce ? false : "hidden"}
            animate="show"
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <ArrowLink href="/login">Start free</ArrowLink>
            <Link href="#how" className="au-ghost">
              See how it works
            </Link>
          </motion.div>
        </div>

        <motion.div
          className="relative z-10 min-w-0"
          initial={reduce ? false : { opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT_CUBIC, delay: 0.6 }}
        >
          <HeroPanel />
        </motion.div>
      </div>
    </section>
  );
}

/* iPhone mockup showing the product's analytics. CSS-built device frame;
   the screen is a real app UI (app bar, range control, chart, marker list,
   tab bar) at true phone-UI scale — assembled from the real chart parts. */
function PhoneScreen() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const rows: { n: string; vals: number[]; status: string; color: string }[] = [
    {
      n: "Triglycerides",
      vals: [210, 195, 178, 162, 148, 130, 98],
      status: "In range",
      color: GREEN,
    },
    {
      n: "HbA1c",
      vals: [5.4, 5.6, 5.9, 6.2, 6.4, 5.8, 5.6],
      status: "Drifting",
      color: "var(--borderline)",
    },
    {
      n: "Vitamin D",
      vals: [18, 21, 24, 31, 38, 42, 46],
      status: "In range",
      color: GREEN,
    },
    {
      n: "hs-CRP",
      vals: [3.2, 2.8, 2.1, 1.6, 1.2, 0.9, 0.8],
      status: "In range",
      color: GREEN,
    },
  ];
  const ranges = ["1Y", "5Y", "All"];
  return (
    <div ref={ref} className="flex flex-col bg-page">
      {/* status bar */}
      <div className="flex items-center justify-between px-5 pb-1.5 pt-3">
        <span className="au-mono text-[0.55rem] text-ink">9:41</span>
        <span className="flex items-center gap-1" aria-hidden>
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span className="h-1 w-1 rounded-full bg-ink-2" />
        </span>
      </div>
      {/* app bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-base leading-none text-ink-2" aria-hidden>
          ‹
        </span>
        <span className="au-mono text-[0.55rem] text-ink-3">Biomarkers</span>
        <span className="grid size-5 place-items-center rounded-full bg-paper-3 au-mono text-[0.5rem] text-ink-2">
          P
        </span>
      </div>
      {/* marker header */}
      <div className="px-4 pt-1">
        <p className="au-mono text-[0.5rem] tracking-[0.08em] text-ink-3">
          LDL CHOLESTEROL · MG/DL
        </p>
        <div className="mt-1 flex items-end justify-between">
          <p className="au-num text-[1.65rem] leading-none text-ink">168</p>
          <span
            className="rounded-full px-2 py-0.5 text-[0.5rem] font-medium"
            style={{ backgroundColor: "var(--out-soft)", color: "var(--au-out)" }}
          >
            Out of range
          </span>
        </div>
        <p
          className="mt-1 text-[0.5rem] font-medium"
          style={{ color: "var(--au-out)" }}
        >
          ↑ +75% in 8 years
        </p>
      </div>
      {/* range segmented control */}
      <div className="mx-4 mt-2.5 flex gap-0.5 rounded-full border border-line bg-paper-2 p-0.5">
        {ranges.map((r) => (
          <span
            key={r}
            className={cn(
              "flex-1 rounded-full py-1 text-center au-mono text-[0.5rem]",
              r === "All" ? "bg-paper-3 text-ink" : "text-ink-3",
            )}
          >
            {r}
          </span>
        ))}
      </div>
      {/* the line */}
      <div className="mt-1 h-[112px] w-full pr-1.5">
        <TrendChart
          data={DEMO}
          domain={[60, 190]}
          band={[40, 130]}
          height={112}
          animate={inView}
          yWidth={22}
          tickFontSize={7}
        />
      </div>
      {/* marker list */}
      <div className="mt-1 flex items-center justify-between px-4">
        <span className="au-mono text-[0.5rem] tracking-[0.08em] text-ink-3">
          YOUR MARKERS
        </span>
        <span className="au-mono text-[0.5rem] text-ink-3">16</span>
      </div>
      <div className="mt-1 flex flex-col divide-y divide-line border-t border-line px-4">
        {rows.map((r) => (
          <div key={r.n} className="flex items-center gap-2 py-2">
            <span className="min-w-0 flex-1 truncate text-[0.72rem] text-ink">
              {r.n}
            </span>
            <svg viewBox="0 0 80 24" className="h-4 w-12 shrink-0" aria-hidden>
              <polyline
                points={sparkPts(r.vals)}
                fill="none"
                stroke="var(--brand)"
                strokeOpacity="0.7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="w-14 shrink-0 text-right text-[0.55rem] font-medium"
              style={{ color: r.color }}
            >
              {r.status}
            </span>
          </div>
        ))}
      </div>
      {/* tab bar */}
      <div className="mt-2 grid grid-cols-3 border-t border-line pt-2">
        {[
          ["Trends", true],
          ["Markers", false],
          ["Profile", false],
        ].map(([label, active]) => (
          <span
            key={label as string}
            className={cn(
              "text-center au-mono text-[0.5rem]",
              active ? "text-brand" : "text-ink-3",
            )}
          >
            {label as string}
          </span>
        ))}
      </div>
      {/* home indicator */}
      <div className="mx-auto my-2 h-1 w-24 rounded-full bg-ink-3/50" />
    </div>
  );
}

function PhoneSection() {
  return (
    <section className="scroll-mt-20 border-t border-line py-20 sm:py-28 md:py-40">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-6 md:grid-cols-2 md:gap-16">
        <ScrubIn x={-44} className="min-w-0">
          <span className="au-eyebrow">The app</span>
          <h2 className="au-hl mt-4 max-w-[18ch] text-[clamp(1.9rem,1.2rem+2.4vw,3rem)] leading-[1.1] text-ink">
            The whole picture, in your <span className="em">pocket</span>.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">
            Every marker, every year, the same coloured line — on the phone you
            carry into the consultation room.
          </p>
          <p className="au-mono mt-8 text-[0.75rem] tracking-[0.06em] text-ink-3">
            70+ markers · 8 years · 3 profiles
          </p>
        </ScrubIn>

        <ScrubIn y={48} className="min-w-0">
          <Parallax amount={22}>
            {/* device frame: near-black bezel, hairline edge, dynamic island */}
            <div className="relative mx-auto w-[248px] rounded-[42px] border border-line-strong bg-[#0d0d0c] p-2">
              <div
                aria-hidden
                className="absolute left-1/2 top-[15px] z-10 h-[18px] w-[70px] -translate-x-1/2 rounded-full bg-black"
              />
              <div className="overflow-hidden rounded-[34px] border border-line">
                <PhoneScreen />
              </div>
            </div>
          </Parallax>
        </ScrubIn>
      </div>
    </section>
  );
}

/* Small instrument tiles reused across the floating collage. */
function OliveStat({
  label,
  value,
  unit,
  foot,
  countTo,
}: {
  label: string;
  value?: string;
  unit?: string;
  foot?: string;
  countTo?: number;
}) {
  return (
    <div className="au-card au-card--olive rounded-2xl p-5">
      <p className="au-mono text-[0.6875rem] text-ink-3">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="au-num text-[2.75rem] leading-none text-ink">
          {countTo != null ? <CountUp to={countTo} /> : value}
        </span>
        {unit ? <span className="au-mono text-[0.7rem] text-ink-3">{unit}</span> : null}
      </div>
      {foot ? <p className="au-mono mt-3 text-[0.6875rem] text-ink-3">{foot}</p> : null}
    </div>
  );
}

/* Floating collage / parallax cluster — four instrument tiles anchored to the
   four corners around a narrow, vertically-centred headline. The headline
   column (max-w-sm) clears the side cards horizontally, so drift never
   collides with the text. Larger cards drift slower, mixed directions,
   adjacent speeds differ; damped in Parallax. Calm, not scattered. */
function FloatingCollage() {
  return (
    <section className="relative overflow-hidden border-t border-line py-20 sm:py-28 md:py-40">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        {/* corner tiles — large screens only */}
        <div className="pointer-events-none absolute inset-x-5 inset-y-0 hidden lg:block">
          <Parallax amount={20} className="absolute left-0 top-[48px] w-[224px]">
            <OliveStat
              label="Readings in range"
              countTo={31}
              foot="of 34 tracked · +6 this year"
            />
          </Parallax>
          <Parallax amount={-28} className="absolute bottom-[48px] left-[24px] w-[204px]">
            <div className="au-card au-card--accent rounded-2xl p-5">
              <p className="au-mono text-[0.6875rem] opacity-70">Latest HbA1c</p>
              <p className="au-num mt-2 text-[2.5rem] leading-none">5.6</p>
              <p className="au-mono mt-3 text-[0.6875rem] opacity-70">back in range</p>
            </div>
          </Parallax>
          <Parallax
            amount={12}
            className="pointer-events-auto absolute right-0 top-[48px] w-[320px]"
          >
            <div className="au-card rounded-2xl p-4">
              <RecoveryDemo />
            </div>
          </Parallax>
          <Parallax amount={-18} className="absolute bottom-[48px] right-[24px] w-[288px]">
            <div className="au-card au-card--olive rounded-2xl p-5">
              <FamilyPanel />
            </div>
          </Parallax>
        </div>

        {/* narrow centred headline — the one centred block; clears the corners */}
        <div className="relative z-10 mx-auto max-w-sm py-8 text-center lg:h-[600px] lg:py-0">
          <ScrubIn y={36} className="lg:absolute lg:inset-x-0 lg:top-1/2 lg:-translate-y-1/2">
            <span className="au-eyebrow">↗ One quiet home</span>
            <h2 className="au-hl mt-4 text-[clamp(1.9rem,1.2rem+2.6vw,3.1rem)] leading-[1.08] text-ink">
              Your whole history, laid out like <span className="em">instruments</span>.
            </h2>
            <p className="mx-auto mt-5 max-w-xs text-base leading-relaxed text-ink-2">
              Every number you have ever logged, arranged so the trends read at
              a glance.
            </p>
          </ScrubIn>
        </div>

        {/* stacked fallback — small screens */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:hidden">
          <OliveStat label="Readings in range" countTo={31} foot="of 34 tracked" />
          <div className="au-card au-card--accent rounded-2xl p-5">
            <p className="au-mono text-[0.6875rem] opacity-70">Latest HbA1c</p>
            <p className="au-num mt-2 text-[2.5rem] leading-none">5.6</p>
            <p className="au-mono mt-3 text-[0.6875rem] opacity-70">back in range</p>
          </div>
          <div className="au-card rounded-2xl p-4 sm:col-span-2">
            <RecoveryDemo />
          </div>
          <div className="au-card au-card--olive rounded-2xl p-5 sm:col-span-2">
            <FamilyPanel />
          </div>
        </div>
      </div>
    </section>
  );
}

/* Sticky split (signature): left column pins (copy + live product window)
   while the numbered capability rows on the right scroll past. */
const SPLIT_ROWS: { num: string; title: string; body: string }[] = [
  {
    num: "01",
    title: "Full timeline",
    body: "Every result you have logged, in order, from your first test to your latest.",
  },
  {
    num: "02",
    title: "Your normal range",
    body: "The band behind the line is your lab's reference range, not a generic textbook one.",
  },
  {
    num: "03",
    title: "Life events",
    body: "Mark a medication or a diet change and see the line answer for itself.",
  },
  {
    num: "04",
    title: "Read any year",
    body: "Run your pointer along the line and the reading, the change and the status re-derive live.",
  },
];

function ProductSplit() {
  return (
    <section id="product" className="scroll-mt-20 border-t border-line py-20 sm:py-28 md:py-40">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="md:sticky md:top-24 md:h-fit">
            <span className="au-chip">
              <span className="au-hex" />
              The product
            </span>
            <h2 className="au-hl mt-5 max-w-[16ch] text-[clamp(1.9rem,1.2rem+2.4vw,3rem)] leading-[1.1] text-ink">
              Every marker gets its own <span className="em">line</span>.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">
              Open any marker to see it across every test you have ever logged.
              Each point is coloured by the range that applied that day.
            </p>
            <div className="mt-8">
              <ProductWindow />
            </div>
          </div>

          {/* static rows: not everything reveals — the pinned window is the
              motion moment in this section */}
          <div>
            {SPLIT_ROWS.map((r) => (
              <div
                key={r.num}
                className="flex min-h-[150px] flex-col justify-center border-t border-line py-9"
              >
                <span className="au-mono text-[0.8rem] text-ink-3">{r.num}</span>
                <h3 className="mt-3 font-display text-2xl text-ink">{r.title}</h3>
                <p className="mt-2 max-w-sm text-base leading-relaxed text-ink-2">
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* CTA — a single frosted panel centred over the moving media (content stays
   left-aligned inside); label → headline → body 3-beat; one arrow button. */
function FinalCTA() {
  return (
    <section id="pricing" className="relative scroll-mt-20 overflow-hidden border-t border-line">
      <Media />
      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="au-glass mx-auto max-w-2xl rounded-[20px] px-7 py-12 sm:px-14 sm:py-16">
          <Reveal>
            <span className="au-eyebrow">Pricing</span>
          </Reveal>
          <MaskLines
            delay={150}
            lines={[
              { t: "Start seeing how" },
              { t: "your body changes.", em: true },
            ]}
            className="au-hl mt-4 text-[clamp(1.9rem,1rem+3.4vw,3.6rem)] leading-[1.08] text-ink"
          />
          <Reveal delay={420}>
            <p className="mt-5 max-w-md text-lg text-ink-2">
              Free for one profile, no card needed. Pro is $4.99 a month for
              family profiles and your whole history.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <ArrowLink href="/login">Start free</ArrowLink>
              <Link href="#how" className="au-ghost">
                See how it works
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* Footer: kept simple — wordmark + the real section links, one hairline row
   for copyright / back-to-top, then the disclaimer. */
function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
              A decade of blood tests, read as a line.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2.5">
            {NAV_LINKS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="au-mono text-[0.72rem] tracking-[0.04em] text-ink-2 transition-colors hover:text-brand"
              >
                {label}
              </a>
            ))}
            <a
              href="/login"
              className="au-mono text-[0.72rem] tracking-[0.04em] text-ink-2 transition-colors hover:text-brand"
            >
              Sign in
            </a>
          </nav>
        </div>
        <div className="mt-12 flex items-center justify-between border-t border-line pt-6">
          <p className="au-mono text-[0.6875rem] text-ink-3">
            © {new Date().getFullYear()} bbiom
          </p>
          <a href="#top" className="au-ghost text-[0.68rem]">
            back to top ↑
          </a>
        </div>
        <p className="mt-8 max-w-2xl text-xs leading-relaxed text-ink-3/80">
          {DISCLAIMER_TEXT}
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div
      id="top"
      className="aurora flex min-h-[100dvh] flex-col overflow-x-clip bg-page text-ink"
    >
      <Nav />
      <main className="flex-1">
        <Hero />

        {/* THE APP — iPhone mockup with the analytics screen */}
        <PhoneSection />

        {/* HOW — the reports-become-trends scrollytelling */}
        <ScrollStory />

        {/* PRODUCT — sticky split */}
        <ProductSplit />

        {/* FLOATING COLLAGE — parallax cluster */}
        <FloatingCollage />

        {/* MARKER WALL */}
        <div id="markers">
          <MarkerWall />
        </div>

        {/* FINAL CTA */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
