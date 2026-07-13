"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
  Tier-B motion primitives (per the Alethia handoff): viewport-entry reveals
  that fire once and never reverse. Transform/opacity only — the CSS lives in
  globals.css (.au-reveal / .inview); reduced motion renders final states.
*/

/** Adds .inview once when the element enters the viewport (top < 90% vh). */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, inView };
}

/**
 * Fade-up reveal wrapper. `delay` staggers siblings (keep ≤4 per viewport,
 * 80–120ms apart). `effect="none"` skips the fade and only flags children
 * (.inview drives line-masks and stroke draw-ons).
 */
export function Reveal({
  as: Tag = "div",
  className,
  delay = 0,
  effect = "fade",
  children,
}: {
  as?: "div" | "section" | "header" | "span" | "li" | "ul";
  className?: string;
  delay?: number;
  effect?: "fade" | "none";
  children: React.ReactNode;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn(effect === "fade" && "au-reveal", inView && "inview", className)}
      style={delay ? ({ "--rv-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * Count-up for data readings: linear count over ~1s, tabular numerals so the
 * width never jitters, locale separators, fires once on viewport entry.
 */
export function CountUp({
  value,
  decimals,
  duration = 1000,
  startDelay = 0,
  className,
}: {
  value: number;
  /** Defaults to the natural precision of the target value (≤2). */
  decimals?: number;
  duration?: number;
  startDelay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const dp =
    decimals ?? Math.min(2, (String(value).split(".")[1] ?? "").length);
  const fmt = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    });
  const [text, setText] = useState(() => fmt(0));
  const done = useRef(false);

  useEffect(() => {
    if (!inView || done.current) return;
    done.current = true;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (reduced) {
        setText(fmt(value));
        return;
      }
      if (start == null) start = t + startDelay;
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      setText(fmt(value * p)); // linear count, per the handoff
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  return (
    <span ref={ref} className={cn("tnum", className)}>
      {text}
    </span>
  );
}
