import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";

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
    <div className="flex min-h-full flex-col">
      <header className="border-b-2 border-rule px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm animate-rise">
          <p className="microlabel">Sign in</p>
          <h1 className="mt-2 font-display text-3xl text-ink">
            Open your logbook
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            There are no passwords here. Enter your email and we send a one-time link.
            The same form signs you up if you are new.
          </p>

          {errorText && (
            <p className="mt-4 rounded-md border border-out/20 bg-out-soft/60 px-3 py-2 text-sm text-out">
              {errorText}
            </p>
          )}

          <div className="mt-6">
            <LoginForm next={next} />
          </div>

          <p className="mt-8 text-xs leading-relaxed text-ink-3">
            HealthTrends tracks values you enter. It does not provide medical advice. Discuss
            results with your healthcare provider.
          </p>
        </div>
      </main>
    </div>
  );
}
