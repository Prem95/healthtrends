"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Activity, CalendarClock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/biomarkers", label: "Biomarkers", icon: Activity, exact: false },
  { href: "/app/timeline", label: "Timeline", icon: CalendarClock, exact: false },
  { href: "/app/settings", label: "Settings", icon: Settings, exact: false },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-2 hover:bg-paper-2 hover:text-ink",
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline md:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
