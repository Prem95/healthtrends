"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveProfile } from "@/app/app/actions";
import type { Profile } from "@/lib/domain";
import { cn } from "@/lib/utils";

/*
  Family profiles. In the sidebar they are a short list with an initial
  avatar; on small screens, a row of chips in the top bar. `fixed` renders the
  same control without switching (the sample dashboard has one profile).
*/
export function ProfileSwitcher({
  profiles,
  activeId,
  layout = "list",
  fixed = false,
}: {
  profiles: Profile[];
  activeId: string;
  layout?: "list" | "chips";
  fixed?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(id: string) {
    if (fixed || id === activeId) return;
    startTransition(async () => {
      await setActiveProfile(id);
      router.refresh();
    });
  }

  if (layout === "chips") {
    return (
      <div
        role="group"
        aria-label="Active profile"
        className={cn("flex max-w-[58vw] items-center gap-1.5 overflow-x-auto", pending && "opacity-60")}
      >
        {profiles.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              disabled={pending}
              aria-pressed={active}
              onClick={() => pick(p.id)}
              className={cn(
                "cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-300",
                active
                  ? "border-ink bg-ink text-page"
                  : "border-line-strong bg-paper text-ink-2 hover:border-brand hover:text-brand",
              )}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Active profile"
      className={cn("flex flex-col gap-0.5", pending && "opacity-60")}
    >
      {profiles.map((p) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            type="button"
            disabled={pending}
            aria-pressed={active}
            onClick={() => pick(p.id)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-left text-sm transition-colors duration-300",
              active ? "font-medium text-ink" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-medium",
                active ? "bg-[image:var(--grad-brand)] text-white" : "bg-paper-3 text-ink-2",
              )}
            >
              {p.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{p.name}</span>
            {active && <span className="ml-auto text-xs font-normal text-ink-3">Viewing</span>}
          </button>
        );
      })}
    </div>
  );
}
