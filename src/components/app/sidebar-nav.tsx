"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
  App navigation. Desktop: a labelled list in the sidebar, the current screen
  on a soft cobalt fill. Mobile: a bottom tab bar with the same
  destinations and "Add" in the middle, since logging a test is the one thing
  people open the app on a phone to do.
*/

type Item = { path: string; label: string; icon: LucideIcon; exact?: boolean; tabOnly?: boolean; sideOnly?: boolean };

const APP_ITEMS: Item[] = [
  { path: "", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/biomarkers", label: "Markers", icon: Activity },
  { path: "/sessions/new", label: "Add", icon: Plus, tabOnly: true },
  { path: "/timeline", label: "Timeline", icon: CalendarDays },
  { path: "/summary", label: "Doctor summary", icon: FileText, sideOnly: true },
  { path: "/settings", label: "Settings", icon: Settings },
];

const DEMO_ITEMS: Item[] = [
  { path: "", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/biomarkers", label: "Markers", icon: Activity },
  { path: "/timeline", label: "Timeline", icon: CalendarDays },
];

function itemsFor(base: string) {
  return base === "/demo" ? DEMO_ITEMS : APP_ITEMS;
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function SideNav({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {itemsFor(base)
        .filter((i) => !i.tabOnly)
        .map(({ path, label, icon: Icon, exact }) => {
          const href = `${base}${path}`;
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-300",
                active
                  ? "bg-brand-soft text-brand-strong"
                  : "text-ink-2 hover:bg-paper-2 hover:text-ink",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}

export function TabBar({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav
      className="tabbar fixed inset-x-0 bottom-0 z-40 flex border-t border-line lg:hidden"
      aria-label="Main"
    >
      {itemsFor(base)
        .filter((i) => !i.sideOnly)
        .map(({ path, label, icon: Icon, exact, tabOnly }) => {
          const href = `${base}${path}`;
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[0.6875rem] font-medium transition-colors duration-300",
                active ? "text-brand" : "text-ink-3",
              )}
            >
              {tabOnly ? (
                <span className="grid size-7 place-items-center rounded-full bg-ink text-page">
                  <Icon className="size-4" aria-hidden />
                </span>
              ) : (
                <Icon className="size-5" aria-hidden />
              )}
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
