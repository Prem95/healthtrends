"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDisplayUnit } from "@/app/app/actions";

/*
  Segmented unit switch shown beside a marker's reading (same .au-seg control as
  the time-window selector). Values are stored canonical; this only changes what
  unit they are rendered in, and the choice persists per user.
*/
export function UnitToggle({
  biomarkerId,
  units,
  active,
}: {
  biomarkerId: string;
  units: string[];
  active: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(unit: string) {
    if (unit === active || pending) return;
    startTransition(async () => {
      await setDisplayUnit(biomarkerId, unit);
      router.refresh();
    });
  }

  return (
    <div className="au-seg" role="group" aria-label="Display unit">
      {units.map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={u === active}
          onClick={() => pick(u)}
          disabled={pending}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
