"use client";

import { useEffect, useRef, useState } from "react";

/*
  A number that counts up from zero the first time it is on screen. The
  server renders the final value, so it is correct without scripts, for
  reduced motion and in print; screen readers only ever get the final value.
*/

// The one easing curve, cubic-bezier(0.22, 1, 0.36, 1), solved for x → y.
function ease(x: number): number {
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t ** 2 * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t ** 2 * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < x) lo = mid;
    else hi = mid;
  }
  return by((lo + hi) / 2);
}

export function CountUp({
  value,
  duration = 1200,
  delay = 0,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    let raf = 0;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        setShown(0);
        timer = window.setTimeout(() => {
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / duration);
            setShown(Math.round(value * ease(p)));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, delay);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden className="tnum">
        {shown}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
