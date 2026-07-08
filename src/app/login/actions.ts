"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/base-url";

const emailSchema = z.string().trim().email();

function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/app";
}

export type AuthState = { ok?: boolean; error?: string; email?: string };

export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const base = await getBaseUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      // Default (built-in) email template routes through /auth/v1/verify and
      // returns a PKCE `code`, which /auth/callback exchanges. Same-device only.
      // With custom SMTP + the branded token_hash template, switch this back to
      // `/auth/confirm` for cross-device links.
      emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { error: "Could not send the link. Try again." };
  return { ok: true, email: parsed.data };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const base = await getBaseUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) redirect("/login?error=oauth_unavailable");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
