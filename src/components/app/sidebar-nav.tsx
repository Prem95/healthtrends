"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/app", label: "Dashboard", exact: true },
  { href: "/app/biomarkers", label: "Biomarkers", exact: false },
  { href: "/app/timeline", label: "Timeline", exact: false },
  { href: "/app/settings", label: "Settings", exact: false },
];

/* Text-first rail, like the landing nav: no icons, an ink marker for the
   active page. Horizontal tabs on mobile, a left rail on desktop. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4 overflow-x-auto border-b border-line md:flex-col md:gap-0.5 md:border-b-0">
      {LINKS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              // mobile: inline text tab with an active underline
              "whitespace-nowrap border-b-2 px-1 py-2.5 text-sm transition-colors",
              // desktop: left rail entry with an active ink marker
              "md:border-b-0 md:border-l-2 md:px-3 md:py-1.5",
              active
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink-3 hover:text-ink",
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
