import { headers } from "next/headers";

/**
 * Absolute base URL for building auth redirect links. Prefers the explicit
 * NEXT_PUBLIC_APP_URL, falling back to the request's forwarded host (works on
 * Vercel preview domains).
 */
export async function getBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
