import { cn } from "@/lib/utils";
import { formatMeasured, statusTone, type ResultStatus } from "@/lib/domain";
import { TONE_VAR } from "@/components/ui/status-badge";

/*
  The hero image: one marker's whole history as a wide line chart that runs
  the width of the page. The reference band is shaded, each test is a
  status-shaped point (dot / diamond / arrow), life events are labelled
  rules, and three readings are labelled directly (first, peak, latest).

  Built as an HTML/SVG hybrid so it is fluid at any width without scaling
  its text: band, rules and line are one stretched SVG (non-scaling
  strokes); points and labels are HTML placed by percentage. Points show
  their reading on hover. On the landing page the line wipes in from the
  left and the points land in order (.m-wipe / .m-pop inside .m-anim).
*/

export type PanoramaPoint = { date: string; value: number; status: ResultStatus };

const ts = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export function TrendPanorama({
  points,
  band,
  bandLabel,
  events = [],
  unit,
  label,
  className,
}: {
  points: PanoramaPoint[];
  band: { min?: number; max?: number } | null;
  /** e.g. "Your lab's range · under 100 mg/dL" */
  bandLabel?: string;
  events?: { date: string; label: string }[];
  unit: string;
  /** The chart's text alternative. */
  label: string;
  className?: string;
}) {
  const values = points.map((p) => p.value);
  const vMin = Math.min(...values, band?.max ?? Infinity, band?.min ?? Infinity);
  const vMax = Math.max(...values, band?.min ?? -Infinity);
  const span = vMax - vMin || 1;
  const lo = vMin - span * 0.42;
  const hi = vMax + span * 0.4; // headroom for the peak's label under event labels
  const y = (v: number) => ((hi - v) / (hi - lo)) * 100;

  const firstYear = new Date(`${points[0].date}T00:00:00Z`).getUTCFullYear();
  const t0 = Date.UTC(firstYear, 0, 1);
  const tLast = ts(points[points.length - 1].date);
  const t1 = tLast + (tLast - t0) * 0.035;
  const x = (iso: string) => ((ts(iso) - t0) / (t1 - t0)) * 100;

  const lastYear = new Date(tLast).getUTCFullYear();
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  const peak = values.indexOf(Math.max(...values));
  const labelled = new Set([0, peak, points.length - 1]);

  const bandTop = band?.max != null ? y(band.max) : 0;
  const bandBottom = band?.min != null ? y(band.min) : 100;

  return (
    <div role="img" aria-label={label} className={cn("relative h-[280px] sm:h-[340px] lg:h-[400px]", className)}>
      {/* Stretched layer: gridlines, band, event rules, the line */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        {years.map((yr) => {
          const gx = ((Date.UTC(yr, 0, 1) - t0) / (t1 - t0)) * 100;
          return (
            <line
              key={yr}
              x1={gx}
              x2={gx}
              y1={0}
              y2={100}
              stroke="var(--chart-grid)"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {band && (
          <g className="m-fade" style={{ "--d": "150ms" } as React.CSSProperties}>
            <rect x={0} y={bandTop} width={100} height={bandBottom - bandTop} fill="var(--in-range)" opacity={0.09} />
            {band.max != null && (
              <line
                x1={0}
                x2={100}
                y1={bandTop}
                y2={bandTop}
                stroke="var(--in-range)"
                strokeOpacity={0.55}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {band.min != null && (
              <line
                x1={0}
                x2={100}
                y1={bandBottom}
                y2={bandBottom}
                stroke="var(--in-range)"
                strokeOpacity={0.55}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
        )}
        {events.map((e) => (
          <line
            key={e.date}
            className="m-fade"
            style={{ "--d": "900ms" } as React.CSSProperties}
            x1={x(e.date)}
            x2={x(e.date)}
            y1={6}
            y2={100}
            stroke="var(--chart-axis)"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="m-wipe absolute inset-0" style={{ "--d": "250ms" } as React.CSSProperties} aria-hidden>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full overflow-visible">
          <polyline
            points={points.map((p) => `${x(p.date).toFixed(3)},${y(p.value).toFixed(3)}`).join(" ")}
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Crisp layer: labels and points */}
      {band && bandLabel && (
        // Inside the band at its lower edge, where readings rarely sit.
        <p
          className="m-fade absolute left-0 -translate-y-full pb-2 pl-2 text-xs font-medium text-ink-2"
          style={{ top: `${Math.min(bandBottom, 100)}%`, "--d": "300ms" } as React.CSSProperties}
          aria-hidden
        >
          <StatusDot /> {bandLabel}
        </p>
      )}

      {events.map((e) => (
        <p
          key={e.date}
          className="m-fade absolute top-0 whitespace-nowrap pl-2 text-xs text-ink-2"
          style={{ left: `${x(e.date)}%`, "--d": "900ms" } as React.CSSProperties}
          aria-hidden
        >
          {e.label}
        </p>
      ))}

      {points.map((p, i) => {
        const showValue = labelled.has(i);
        const above = i === peak || p.value >= (points[i - 1]?.value ?? -Infinity);
        return (
          <span
            key={p.date}
            className="m-pop group absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left: `${x(p.date)}%`, top: `${y(p.value)}%`, "--d": `${300 + Math.round((x(p.date) / 100) * 1300)}ms` } as React.CSSProperties}
            aria-hidden
          >
            <PointGlyph status={p.status} large={i === points.length - 1} />
            {showValue && (
              <span
                className={cn(
                  "figure absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[1.0625rem] text-ink transition-opacity duration-300 group-hover:opacity-0",
                  above ? "bottom-full" : "top-full",
                )}
              >
                {formatMeasured(p.value)}
              </span>
            )}
            <span
              className={cn(
                "pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-xs text-page opacity-0 shadow-[var(--shadow-pop)] transition-opacity duration-300 group-hover:opacity-100",
                // Keep the label inside the chart at either end.
                x(p.date) > 78 ? "right-0" : x(p.date) < 22 ? "left-0" : "left-1/2 -translate-x-1/2",
              )}
            >
              {monthYear(p.date)} · {formatMeasured(p.value)} {unit}
            </span>
          </span>
        );
      })}

      <div className="absolute inset-x-0 top-full flex pt-3 text-xs text-ink-3 tnum" aria-hidden>
        {years.map((yr, i) => (
          <span
            key={yr}
            className={cn("absolute -translate-x-0 pl-1.5", i % 2 === 1 && "max-sm:hidden")}
            style={{ left: `${((Date.UTC(yr, 0, 1) - t0) / (t1 - t0)) * 100}%` }}
          >
            {yr}
          </span>
        ))}
      </div>
    </div>
  );
}

/* The band's key: a small swatch of the shaded range. */
function StatusDot() {
  return (
    <span
      className="mr-1 inline-block size-2.5 rounded-[3px] border border-in-range/60 bg-in-range/15 align-[-1px]"
      aria-hidden
    />
  );
}

/* A test on the line: its status shape, ringed in the chart surface so
   overlapping marks stay separate. The latest reading is drawn larger. */
function PointGlyph({ status, large = false }: { status: ResultStatus; large?: boolean }) {
  const fill = TONE_VAR[statusTone(status)];
  const s = large ? 18 : 13;
  return (
    <svg width={s} height={s} viewBox="-1 -1 12 12" className="overflow-visible" aria-hidden>
      <g fill={fill} stroke="var(--paper)" strokeWidth={1.6} paintOrder="stroke">
        {status === "IN_RANGE" && <circle cx="5" cy="5" r="4.4" />}
        {(status === "BORDERLINE_HIGH" || status === "BORDERLINE_LOW") && <path d="M5 0 10 5 5 10 0 5Z" />}
        {status === "HIGH" && <path d="M5 0.5 10 9.5H0Z" />}
        {status === "LOW" && <path d="M5 9.5 0 0.5h10Z" />}
        {status === "NO_RANGE" && <circle cx="5" cy="5" r="4" fill="var(--paper)" stroke={fill} strokeWidth={1.8} />}
      </g>
    </svg>
  );
}
