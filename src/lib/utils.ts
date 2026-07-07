import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number for display with sensible precision (no trailing noise). */
export function formatNumber(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return "n/a";
  const rounded = Number(n.toFixed(maxDecimals));
  return rounded.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}

/** Format an ISO date (YYYY-MM-DD) as "15 Jan 2026" without timezone drift. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

/** Today as a plain ISO date (local calendar day, no TZ shift). */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Months between an ISO date and today (positive = in the past). */
export function monthsSince(iso: string): number {
  const then = new Date(iso.split("T")[0] + "T00:00:00");
  const now = new Date();
  return (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
}
