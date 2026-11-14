"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/components/landing/nav-links";

/* Marketing header: always legible (solid paper), sticky, with a real menu
   on small screens. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="tabbar sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" aria-label="bbiom home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          {NAV_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm text-ink-2 transition-colors duration-300 hover:text-brand"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Start free</Link>
          </Button>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
            className="grid size-10 cursor-pointer place-items-center rounded-[10px] text-ink md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      <nav
        id="site-menu"
        aria-label="Sections"
        className={cn("border-t border-line px-5 pb-3 pt-1 md:hidden", !open && "hidden")}
      >
        {[...NAV_LINKS, ["Sample dashboard", "/demo"], ["Sign in", "/login"]].map(([label, href]) => (
          <a
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className="block border-b border-line py-3 text-[0.9375rem] text-ink-2 last:border-0"
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
