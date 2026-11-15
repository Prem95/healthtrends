import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DISCLAIMER_TEXT } from "@/components/disclaimer";
import { NAV_LINKS } from "@/components/site/nav-links";

/*
  Footer: the wordmark and a one-line promise on the left, three short link
  columns on the right, then the disclaimer in full. No social icons, no
  newsletter box — nothing the product does not have.
*/
const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Product", links: [...NAV_LINKS.slice(0, 3), ["Sample dashboard", "/demo"]] },
  { title: "Plans", links: [NAV_LINKS[4], ["Start free", "/login"]] },
  { title: "Your data", links: [NAV_LINKS[3], ["Sign in", "/login"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-[1360px] px-[var(--gutter)] pb-10 pt-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Logo />
            <p className="display mt-6 max-w-[20ch] text-display-s text-ink">Your blood tests, as one record.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="text-xs font-medium text-ink-3">{c.title}</p>
                <ul className="mt-4 space-y-3">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-[0.9375rem] text-ink-2 transition-colors duration-300 hover:text-brand"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-ink-3">{DISCLAIMER_TEXT}</p>
          <p className="shrink-0 text-xs text-ink-3">© {new Date().getFullYear()} bbiom</p>
        </div>
      </div>
    </footer>
  );
}
