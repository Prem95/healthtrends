"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
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
      setN(Math.round((1 - Math.pow(1 - p, 3)) * to));
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
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

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

/* Depth: the wrapped panel travels slower than the page around it. */
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
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/* The hero asset leans gently toward the pointer (mouse only, spring-smoothed). */
function TiltCard({ children, max = 3.5 }: { children: React.ReactNode; max?: number }) {
  const reduce = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  const ry = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 2 * max);
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 2 * max);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* CTA buttons pull a few pixels toward the cursor and spring back. */
function Magnetic({ children, strength = 0.22 }: { children: React.ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 16 });
  const y = useSpring(my, { stiffness: 220, damping: 16 });
  return (
    <motion.div
      className="inline-flex"
      style={reduce ? undefined : { x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left - r.width / 2) * strength);
        my.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* Hero orchestration: one timeline staggers headline words, sub copy and
   CTAs; the panel arrives on its own spring a beat later. */
const H1_WORDS: { t: string; em?: boolean }[] = [
  { t: "See" },
  { t: "how" },
  { t: "your" },
  { t: "body" },
  { t: "has" },
  { t: "changed" },
  { t: "over", em: true },
  { t: "the", em: true },
  { t: "years.", em: true },
];
const HERO_STAGE: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const HERO_LINE: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};
const HERO_WORD: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE_OUT_CUBIC },
  },
};
const HERO_ITEM: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE_OUT_CUBIC },
  },
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

// "Log it once": a pre-filled entry panel with one row being typed.
function EntryPanel() {
  const rows: [string, string, string][] = [
    ["LDL cholesterol", "142", "mg/dL"],
    ["HDL cholesterol", "51", "mg/dL"],
    ["Triglycerides", "128", "mg/dL"],
  ];
  return (
    <div>
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span className="font-display text-sm text-ink">Lipid panel</span>
        <span className="text-xs text-ink-3">5 markers</span>
      </div>
      <div className="flex flex-col divide-y divide-line">
        {rows.map(([label, val, unit]) => (
          <div key={label} className="flex items-center justify-between py-2">
            <span className="text-sm text-ink-2">{label}</span>
            <span className="flex items-baseline gap-1">
              <span className="font-display text-sm text-ink tnum">{val}</span>
              <span className="text-[0.7rem] text-ink-3">{unit}</span>
            </span>
          </div>
        ))}
        {/* the most recent row, just entered */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-ink">Fasting glucose</span>
          <span className="flex items-baseline gap-1">
            <span className="font-display text-sm text-brand-strong tnum">
              <CountUp to={98} />
            </span>
            <span className="text-[0.7rem] text-ink-3">mg/dL</span>
          </span>
        </div>
      </div>
    </div>
  );
}

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
          id="bento"
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
        Try it - drag a reading up or down and watch its colour follow the range.
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
  id,
  data,
  domain,
  band,
  height,
  animate = true,
  annotation,
  yWidth = 40,
  renderDot,
  onScrub,
  scrubIndex,
}: {
  id: string;
  data: TrendPoint[];
  domain: [number, number];
  band: [number, number];
  height: number;
  animate?: boolean;
  annotation?: { x: string; label: string };
  yWidth?: number;
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
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          tick={{ fill: "var(--ink-3)", fontSize: 11 }}
          axisLine={{ stroke: "var(--line-strong)" }}
          tickLine={false}
          padding={{ left: 10, right: 10 }}
        />
        <YAxis
          domain={domain}
          tick={{ fill: "var(--ink-3)", fontSize: 11 }}
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
          fill={`url(#${id})`}
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
    <div ref={ref} className="au-card au-float overflow-hidden rounded-[20px]">
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
            id={`pw-${m.key}`}
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
    <div ref={ref} className="au-card au-float overflow-hidden rounded-[24px]">
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
      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden border-y border-line bg-line">
        {stats.map(([label, val]) => (
          <div key={label} className="bg-paper px-6 py-3">
            <p className="text-[0.68rem] uppercase tracking-[0.1em] text-ink-3">
              {label}
            </p>
            <p className="au-num mt-0.5 text-sm text-ink">{val}</p>
          </div>
        ))}
      </div>
      <div className="h-[236px] w-full pr-3 pt-1">
        <TrendChart
          id="hero"
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
          className="absolute w-[220px] rounded-xl border border-line bg-paper p-3.5 shadow-[0_6px_18px_-12px_rgba(15,26,32,0.25)]"
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
            className="relative rounded-xl border bg-paper p-3 transition-[opacity,border-color,box-shadow] duration-500 motion-reduce:transition-none"
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
    <section id="how" className="scroll-mt-20 border-t border-line py-20 md:py-28">
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
              <div ref={panelRef} className="au-card au-float rounded-[24px] p-5 sm:p-6">
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
    <section className="border-t border-line py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <ScrubIn y={48}>
        <div
          className="relative overflow-hidden rounded-[28px] px-6 py-12 sm:px-10 md:py-16"
          style={{ background: "var(--au-blue)", color: "var(--au-blue-ink)" }}
        >
          <div
            aria-hidden
            className="au-field"
            style={{
              background:
                "radial-gradient(560px 420px at 85% 10%, rgba(11, 90, 147, 0.16), transparent 66%), radial-gradient(480px 380px at 8% 100%, rgba(14, 111, 191, 0.12), transparent 70%)",
            }}
          />
          <div className="relative">
          <h2 className="au-hl max-w-xl text-[clamp(1.7rem,1.1rem+2.2vw,2.75rem)] leading-[1.14]">
            70+ markers, ready on day one.
          </h2>
          <p className="mt-3 max-w-md text-base opacity-75">
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
                <div
                  className="wall-chip rounded-xl border p-3 transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white/40"
                  style={{ borderColor: "rgba(11, 90, 147, 0.22)" }}
                >
                  <p className="truncate text-[0.8rem] font-medium">{m.n}</p>
                  <svg
                    viewBox="0 0 80 24"
                    className="mt-2 h-6 w-full"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <polyline
                      className="draw-line"
                      pathLength={1}
                      points={sparkPts(m.vals)}
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.65"
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
              className="grid place-items-center rounded-xl border border-dashed p-3 text-[0.8rem] font-medium transition-[transform,opacity] duration-500 motion-reduce:transition-none"
              style={{
                borderColor: "rgba(11, 90, 147, 0.35)",
                opacity: inView ? 0.8 : 0,
                transform: inView ? undefined : "translateY(20px)",
                transitionDelay: `${WALL.length * 45}ms`,
                transitionTimingFunction: "var(--au-ease)",
              }}
            >
              and 54 more
            </div>
          </div>
          </div>
        </div>
        </ScrubIn>
      </div>
    </section>
  );
}

/* Kinetic-type moment reserved for the CTA: each word rises from behind a
   line mask on a spring, the italic emphasis landing last. */
function StaggerWords({
  words,
  className,
}: {
  words: { t: string; em?: boolean }[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.h2
      className={className}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.075 } } }}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
    >
      {words.map((w, i) => (
        <span key={i}>
          <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <motion.span
              className={cn("inline-block", w.em && "em")}
              variants={{
                hidden: { y: "115%", opacity: 0 },
                show: {
                  y: "0%",
                  opacity: 1,
                  transition: { type: "spring", duration: 0.8, bounce: 0.15 },
                },
              }}
            >
              {w.t}
            </motion.span>
          </span>{" "}
        </span>
      ))}
    </motion.h2>
  );
}

// Pill button built from Tailwind utilities (no dependency on hand-authored
// classes), so it renders correctly regardless of stylesheet load order.
function Btn({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: "primary" | "ghost" | "light" | "ghost-light";
  size?: "md" | "sm";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,background-color,color] duration-200 will-change-transform active:scale-[0.97]",
        size === "sm" ? "px-5 py-2 text-sm" : "px-6 py-3 text-[0.9375rem]",
        variant === "primary" &&
          "bg-[#0f1a20] text-[#f6f8f8] hover:-translate-y-0.5 hover:bg-black",
        variant === "ghost" && "text-[#16232a] hover:text-[#54636c]",
        variant === "light" &&
          "bg-[#f6f8f8] text-[#0f1a20] hover:-translate-y-0.5 hover:bg-white",
        variant === "ghost-light" && "text-[#d9e6ee] hover:text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export default function Home() {
  const reduce = useReducedMotion();
  return (
    <div
      data-theme="light"
      className="aurora flex min-h-[100dvh] flex-col overflow-x-clip bg-page text-ink"
    >
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-page/70 backdrop-blur-md">
        {/* scroll progress, drawn as the page's own trend line */}
        <div aria-hidden className="au-progress" />
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-ink-2 md:flex">
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#product" className="transition-colors hover:text-ink">
              The product
            </a>
            <a href="#pricing" className="transition-colors hover:text-ink">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-1">
            <Btn href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </Btn>
            <Btn href="/login" size="sm">
              Start free
            </Btn>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO — asymmetric: copy left, the line itself as the visual right */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="au-field"
            style={{
              background:
                "radial-gradient(640px 460px at 78% 22%, rgba(14, 111, 191, 0.12), transparent 68%), radial-gradient(540px 420px at 6% 92%, rgba(11, 90, 147, 0.08), transparent 70%)",
            }}
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-6 md:grid-cols-[1.02fr_1fr] md:gap-14 md:pb-28 md:pt-24 lg:gap-20">
            <motion.div
              className="relative z-10 min-w-0 max-w-xl"
              variants={HERO_STAGE}
              initial={reduce ? false : "hidden"}
              animate="show"
            >
              <motion.h1
                variants={HERO_LINE}
                className="au-hl pb-1 text-[clamp(2.6rem,1.2rem+4.2vw,4.4rem)] leading-[1.08] text-ink [text-wrap:balance]"
              >
                {H1_WORDS.map((w, i) => (
                  <span key={i}>
                    <motion.span
                      variants={HERO_WORD}
                      className={cn("inline-block", w.em && "em")}
                    >
                      {w.t}
                    </motion.span>{" "}
                  </span>
                ))}
              </motion.h1>
              <motion.p
                variants={HERO_ITEM}
                className="mt-6 max-w-md text-lg leading-relaxed text-ink-2"
              >
                Log each result once. HealthTrends draws every marker as a
                single line across the years, so a decade of blood tests reads
                at a glance.
              </motion.p>
              <motion.div
                variants={HERO_ITEM}
                className="mt-8 flex flex-wrap items-center gap-2"
              >
                <Btn href="/login">
                  Start free{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Btn>
                <Btn href="#how" variant="ghost">
                  See how it works
                </Btn>
              </motion.div>
            </motion.div>

            <motion.div
              className="relative z-10 min-w-0"
              initial={reduce ? false : { opacity: 0, y: 40, scale: 0.965 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", duration: 0.9, bounce: 0.18, delay: 0.25 }}
            >
              <TiltCard>
                <HeroPanel />
              </TiltCard>
            </motion.div>
          </div>
        </section>

        {/* HOW — scrollytelling: a pile of readings becomes a direction */}
        <ScrollStory />

        {/* FEATURES — bento: one tall feature + two supporting tiles */}
        <section className="border-t border-line py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <ScrubIn y={36}>
              <h2 className="au-hl max-w-2xl text-[clamp(1.9rem,1.2rem+2.4vw,3rem)] leading-[1.1] text-ink">
                A quiet home for every result.
              </h2>
            </ScrubIn>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {/* A — wide feature: watch a marker recover over the years */}
              <ScrubIn y={44} className="md:col-span-2">
              <article className="au-card h-full overflow-hidden rounded-[22px]">
                <div className="grid gap-6 p-7 md:grid-cols-[0.82fr_1.18fr] md:items-center md:gap-9 md:p-9">
                  <div>
                    <h3 className="font-display text-xl text-ink">
                      Watch every line
                    </h3>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-2">
                      Every marker is drawn across every test you have logged,
                      your own normal range shaded behind it. This one climbed
                      out of the red over three years.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[
                        ["8 years", "logged"],
                        ["34 results", "tracked"],
                        ["Back to normal", "outcome"],
                      ].map(([n, l]) => (
                        <span
                          key={n}
                          className="inline-flex items-baseline gap-1.5 rounded-full border border-line bg-paper-2 px-3 py-1 text-xs"
                        >
                          <span className="au-num text-ink">{n}</span>
                          <span className="text-ink-3">{l}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <RecoveryDemo />
                </div>
              </article>
              </ScrubIn>

              {/* B — log it once (warm sand tile, converges from the left) */}
              <ScrubIn x={-56}>
              <article className="au-card au-card--amber flex h-full flex-col rounded-[22px] p-7">
                <h3 className="font-display text-xl text-ink">Log it once</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  Pick a panel and type your numbers. The rows are already there,
                  so each new result takes seconds.
                </p>
                <div className="mt-5">
                  <EntryPanel />
                </div>
              </article>
              </ScrubIn>

              {/* C — the whole family, side by side (ocean tile, from the right) */}
              <ScrubIn x={56}>
              <article className="au-card au-card--blue flex h-full flex-col rounded-[22px] p-7">
                <h3 className="font-display text-xl text-ink">
                  Everyone you look after
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  Separate profiles for parents, partners and kids, each with
                  their own lines, side by side in one place.
                </p>
                <div className="mt-auto pt-5">
                  <FamilyPanel />
                </div>
              </article>
              </ScrubIn>
            </div>
          </div>
        </section>

        {/* PRODUCT split */}
        <section id="product" className="scroll-mt-20 border-t border-line py-20 md:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 md:grid-cols-2 md:gap-16">
            {/* convergence pair: copy arrives from the left, the window from
                the right, both scrubbed by scroll and meeting in the middle */}
            <ScrubIn x={-56} className="min-w-0">
              <span className="au-eyebrow">The product</span>
              <h2 className="au-hl mt-3 max-w-[16ch] pb-1 text-[clamp(1.9rem,1.2rem+2.4vw,3rem)] leading-[1.12] text-ink">
                Every marker gets its own <span className="em">line</span>.
              </h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">
                Open any marker to see it across every test you have ever
                logged. Each point is coloured by the range that applied that
                day. Try the tabs, then run your pointer along the line.
              </p>
              <div className="mt-7 flex flex-col divide-y divide-line border-t border-line">
                {[
                  ["Full timeline", "Every result you have logged, in order."],
                  ["Your normal range", "Your lab's range, not a textbook one."],
                  ["Life events", "Mark a medication or diet change."],
                ].map(([t, d]) => (
                  <div key={t} className="flex items-baseline gap-4 py-3.5">
                    <span className="w-36 shrink-0 font-display text-sm text-ink">
                      {t}
                    </span>
                    <span className="text-sm text-ink-2">{d}</span>
                  </div>
                ))}
              </div>
            </ScrubIn>
            <ScrubIn x={56} className="min-w-0">
              {/* depth: the window travels slower than the page around it */}
              <Parallax amount={30}>
                <ProductWindow />
              </Parallax>
            </ScrubIn>
          </div>
        </section>

        {/* MARKER WALL — the one tinted band */}
        <MarkerWall />

        {/* FINAL CTA — the deep-ocean climax, bookending the porcelain page */}
        <section
          id="pricing"
          className="relative scroll-mt-20 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #103048 0%, #0b2135 100%)",
          }}
        >
          <div
            aria-hidden
            className="au-field"
            style={{
              background:
                "radial-gradient(700px 480px at 70% 0%, rgba(53, 171, 239, 0.16), transparent 65%), radial-gradient(560px 440px at 12% 100%, rgba(14, 111, 191, 0.22), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-6 md:py-32">
            <StaggerWords
              className="au-hl pb-1 text-[clamp(2.2rem,1.3rem+3vw,3.6rem)] leading-[1.12] text-[#f2f7fa]"
              words={[
                { t: "Start" },
                { t: "seeing" },
                { t: "how" },
                { t: "your" },
                { t: "body" },
                { t: "changes.", em: true },
              ]}
            />
            <Reveal delay={420}>
              <p className="mx-auto mt-5 max-w-md text-lg text-[#f2f7fa]/70">
                Free for one profile, no card needed. Pro is $4.99 a month for
                family profiles and your whole history.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Magnetic>
                  <Btn href="/login" variant="light">
                    Start free{" "}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Btn>
                </Magnetic>
                <Magnetic strength={0.16}>
                  <Btn href="#how" variant="ghost-light">
                    See how it works
                  </Btn>
                </Magnetic>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <p className="max-w-2xl text-xs leading-relaxed text-ink-3">
            {DISCLAIMER_TEXT}
          </p>
          <p className="mt-3 text-xs text-ink-3">
            © {new Date().getFullYear()} HealthTrends
          </p>
        </div>
      </footer>

      {/* film grain over the whole landing (fixed, non-interactive) */}
      <div aria-hidden className="au-grain" />
    </div>
  );
}
