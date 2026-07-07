"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import { setActiveProfile } from "@/app/app/actions";
import type { Profile } from "@/lib/domain";

export function ProfileSwitcher({
  profiles,
  activeId,
}: {
  profiles: Profile[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (profiles.length <= 1) {
    const p = profiles[0];
    return (
      <div className="flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5">
        <Avatar name={p.name} />
        <span className="text-sm font-medium text-ink">{p.name}</span>
      </div>
    );
  }

  return (
    <label className="relative flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand/40">
      <Avatar name={profiles.find((p) => p.id === activeId)?.name ?? "?"} />
      <select
        aria-label="Active profile"
        value={activeId}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          startTransition(async () => {
            await setActiveProfile(id);
            router.refresh();
          });
        }}
        className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-ink focus:outline-none"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2 size-3.5 text-ink-3" />
    </label>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-6 place-items-center rounded-full bg-brand text-[0.65rem] font-semibold text-paper">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
