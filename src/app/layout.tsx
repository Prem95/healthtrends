import type { Metadata, Viewport } from "next";
import { Funnel_Display, Funnel_Sans } from "next/font/google";
import "./globals.css";

// Display: Funnel Display (2024), a contemporary grotesk with a distinctive
// cut, for one-word headings and big readings. Upright only — no italics.
const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
  display: "swap",
});

// Body and every control: Funnel Sans, the display face's text companion.
const funnelSans = Funnel_Sans({
  variable: "--font-funnel-sans",
  subsets: ["latin"],
  style: ["normal"],
  display: "swap",
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
      className={`${funnelDisplay.variable} ${funnelSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
