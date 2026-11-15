"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/components/site/nav-links";

/*
  Marketing header. Sits on the paper canvas, sticky, and gains a hairline
  once the page scrolls. Small screens get a real menu (a disclosure, not a
  hover). Sign in and the one primary action stay visible at every width.
*/
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "tabbar sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled || open ? "border-line" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-6 px-[var(--gutter)]">
        <Link href="/" aria-label="bbiom home" className="rounded-md">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
          {NAV_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm text-ink-2 transition-colors duration-300 hover:bg-paper-2 hover:text-ink"
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
            className="grid size-10 cursor-pointer place-items-center rounded-full text-ink transition-colors duration-300 hover:bg-paper-2 md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      <nav
        id="site-menu"
        aria-label="Sections"
        className={cn("border-t border-line px-[var(--gutter)] pb-4 pt-1 md:hidden", !open && "hidden")}
      >
        {[...NAV_LINKS, ["Sample dashboard", "/demo"], ["Sign in", "/login"]].map(([label, href]) => (
          <a
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-b border-line py-3.5 text-base text-ink last:border-0"
          >
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
