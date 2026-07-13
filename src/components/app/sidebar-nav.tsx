"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/*
  App navigation in the Alethia mono language. Desktop: uppercase mono links
  in the header, accent tint on hover, ink when active. Mobile: the handoff's
  frosted bottom tab bar — geometric glyphs + 9px mono labels, accent only on
  the active tab.
*/

const LINKS = [
  { href: "/app", label: "Markers", glyph: "⬡", exact: true },
  { href: "/app/biomarkers", label: "Browse", glyph: "≡", exact: false },
  { href: "/app/sessions/new", label: "Log", glyph: "＋", exact: false, mobileOnly: true },
  { href: "/app/timeline", label: "Timeline", glyph: "↗", exact: false },
  { href: "/app/settings", label: "Settings", glyph: "⌂", exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
      {LINKS.filter((l) => !l.mobileOnly).map(({ href, label, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "au-mono text-[0.8125rem] transition-colors duration-300",
              active ? "text-ink" : "text-ink-3 hover:text-brand",
            )}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="au-tabbar fixed inset-x-0 bottom-0 z-40 flex border-t border-line md:hidden"
      aria-label="Main"
    >
      {LINKS.map(({ href, label, glyph, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 pt-2.5 pb-2 font-mono text-[9px] uppercase tracking-[0.06em] transition-colors duration-300",
              active ? "text-brand" : "text-ink-3",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden className="font-sans text-[16px] leading-none">
              {glyph}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
