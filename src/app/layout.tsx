import type { Metadata, Viewport } from "next";
import { Google_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Display: Newsreader (SIL OFL, fonts/OFL.txt), self-hosted as two static
// instances pinned at its opsz-60 display cut — upright and italic, ~23 KB
// each instead of ~140 KB variable files, so the headline paints fast on a
// phone. Headings and big readings only, always weight 400.
const newsreader = localFont({
  variable: "--font-newsreader",
  src: [
    { path: "./fonts/newsreader-display-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/newsreader-display-400-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

// Body and every control: a clean sans with tabular figures for columns.
// next/font has no fallback metrics for this face, so name the system stack
// directly rather than ask it to generate an adjusted fallback.
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: "bbiom | Track your blood test results over time",
  description:
    "Keep every blood test in one place. bbiom plots each biomarker over the years against the reference range on your own lab report, so you can see what is in range, what is borderline and what has changed.",
};

export const viewport: Viewport = {
  themeColor: "#f4f2ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
