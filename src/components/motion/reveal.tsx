"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
  Motion primitive: a viewport-entry reveal
  that fires once and never reverses. Transform/opacity only — the CSS lives in
  globals.css (.reveal / .inview); reduced motion renders final states.
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
 * (.inview) without animating the wrapper itself.
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
      className={cn(effect === "fade" && "reveal", inView && "inview", className)}
      style={delay ? ({ "--rv-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
