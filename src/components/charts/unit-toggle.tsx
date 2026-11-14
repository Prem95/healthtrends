"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setDisplayUnit } from "@/app/app/actions";
import { prettyUnit } from "@/lib/utils";

/*
  Segmented unit switch shown beside a marker's reading. Values are stored
  canonical; this only changes the unit they are rendered in. Signed in, the
  choice is saved per user. With `linkBase` (the sample dashboard) it is a
  plain link that carries the unit in the URL instead.
*/
export function UnitToggle({
  biomarkerId,
  units,
  active,
  linkBase,
}: {
  biomarkerId: string;
  units: string[];
  active: string;
  linkBase?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (linkBase) {
    return (
      <div className="seg" role="group" aria-label="Display unit">
        {units.map((u) => (
          <Link
            key={u}
            href={`${linkBase}?unit=${encodeURIComponent(u)}`}
            aria-current={u === active ? "true" : undefined}
            scroll={false}
            replace
          >
            {prettyUnit(u)}
          </Link>
        ))}
      </div>
    );
  }

  function pick(unit: string) {
    if (unit === active || pending) return;
    startTransition(async () => {
      await setDisplayUnit(biomarkerId, unit);
      router.refresh();
    });
  }

  return (
    <div className="seg" role="group" aria-label="Display unit">
      {units.map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={u === active}
          onClick={() => pick(u)}
          disabled={pending}
        >
          {prettyUnit(u)}
        </button>
      ))}
    </div>
  );
}
