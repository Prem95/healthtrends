import type { Metadata, Viewport } from "next";
import { Google_Sans, Newsreader } from "next/font/google";
import "./globals.css";

// Display: an editorial serif with optical sizes, so the hero and the big
// readings get the high-contrast display cut. Headings and figures only.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

// Body and every control: a clean sans with tabular figures for columns.
const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
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
      className={`${newsreader.variable} ${googleSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
