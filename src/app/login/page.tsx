import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: nextRaw, error } = await searchParams;
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/app";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  const errorText =
    error === "link_expired"
      ? "That sign-in link expired. Request a new one below."
      : error === "oauth_failed" || error === "oauth_unavailable"
        ? "Google sign-in did not complete. Try again or use email."
        : null;

  return (
    <AuthShell>
      <p className="eyebrow">Sign in or sign up</p>
      <h1 className="display mt-3 text-[2rem] text-ink sm:text-[2.5rem]">
        Open your record.
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">
        There are no passwords here. Enter your email and we send a one-time link. The same
        form creates your account if you are new.
      </p>

      {errorText && (
        <p className="mt-5 rounded-lg bg-out-soft px-4 py-3 text-sm text-out-ink">{errorText}</p>
      )}

      <div className="mt-7">
        <LoginForm next={next} />
      </div>

      <p className="mt-8 text-xs leading-relaxed text-ink-3">
        bbiom tracks values you enter and does not provide medical advice. Discuss results
        with your healthcare provider.{" "}
        <Link href="/demo" className="text-brand underline underline-offset-4 hover:text-brand-strong">
          Look at a sample dashboard first
        </Link>
        .
      </p>
    </AuthShell>
  );
}
