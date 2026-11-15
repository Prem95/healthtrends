import { cn } from "@/lib/utils";
import type { MarkerDigest } from "@/lib/digest";
import { RangeBar } from "@/components/charts/range-bar";
import { StatusBadge } from "@/components/ui/status-badge";

/*
  A lab report, re-set: one row per marker with the reading, where it sits
  in the lab's own range, and the status in words. Columns align on tabular
  figures; rows are separated by hairlines only. Range bars fill once in view.
*/
export function LabPanel({
  title,
  meta,
  rows,
  className,
}: {
  title: string;
  meta?: string;
  rows: MarkerDigest[];
  className?: string;
}) {
  return (
    <div className={cn("panel overflow-hidden", className)}>
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <p className="text-[0.9375rem] font-medium text-ink">{title}</p>
        {meta && <p className="text-xs text-ink-3">{meta}</p>}
      </div>
      <table className="w-full text-left">
        <thead className="sr-only sm:not-sr-only">
          <tr className="text-xs text-ink-3">
            <th scope="col" className="px-5 pb-1 pt-3 font-normal sm:px-6">
              Marker
            </th>
            <th scope="col" className="hidden px-2 pb-1 pt-3 text-right font-normal sm:table-cell">
              Result
            </th>
            <th scope="col" className="hidden px-4 pb-1 pt-3 font-normal md:table-cell">
              Your lab&rsquo;s range
            </th>
            <th scope="col" className="px-5 pb-1 pt-3 text-right font-normal sm:px-6">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((d, i) => (
            <tr key={d.id} className="m-item align-middle" style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
              <th scope="row" className="px-5 py-3.5 font-normal sm:px-6">
                <span className="block text-[0.9375rem] font-medium text-ink">{d.name}</span>
                <span className="mt-0.5 block text-sm text-ink-2 tnum sm:hidden">
                  {d.valueLabel} <span className="unit">{d.unit}</span>
                </span>
              </th>
              <td className="hidden whitespace-nowrap px-2 py-3.5 text-right sm:table-cell">
                <span className="text-[0.9375rem] text-ink tnum">{d.valueLabel}</span>{" "}
                <span className="unit">{d.unit}</span>
              </td>
              <td className="hidden w-[38%] px-4 py-3.5 md:table-cell">
                {d.value != null && (
                  <RangeBar
                    value={d.value}
                    min={d.rangeMin}
                    max={d.rangeMax}
                    status={d.status}
                    displayFactor={d.displayFactor}
                  />
                )}
              </td>
              <td className="px-5 py-3.5 text-right sm:px-6">
                <StatusBadge status={d.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
