"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveProfile } from "@/app/app/actions";
import type { Profile } from "@/lib/domain";
import { cn } from "@/lib/utils";

/*
  Family profiles as pill chips (the handoff's "You / Anna / Dad" row):
  mono uppercase 11px, hairline border, active = light fill.
*/
export function ProfileSwitcher({
  profiles,
  activeId,
}: {
  profiles: Profile[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label="Active profile"
      className={cn(
        "flex max-w-[50vw] items-center gap-2 overflow-x-auto sm:max-w-none",
        pending && "opacity-60",
      )}
    >
      {profiles.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            disabled={pending || (active && profiles.length === 1)}
            aria-pressed={active}
            onClick={() => {
              if (active) return;
              startTransition(async () => {
                await setActiveProfile(p.id);
                router.refresh();
              });
            }}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.05em] transition-colors duration-300",
              active
                ? "border-ink bg-ink text-page"
                : "border-rule text-ink-3 hover:border-brand hover:text-ink",
            )}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
