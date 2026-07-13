import type { Metadata } from "next";
import { Google_Sans, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
});

// Editorial display serif for the marketing surfaces (headlines + italic accents).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Instrument-grade monospace for all landing metadata, labels, nav and buttons
// (the Alethia system runs every uppercase micro-label through it).
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HealthTrends | See how your body changes over the years",
  description:
    "Log each blood test once and watch every marker as a line across the years, using the normal range from your own report. See how your body has actually changed over time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${newsreader.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
