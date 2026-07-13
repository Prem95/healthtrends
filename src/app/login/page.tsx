import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/brand/logo";
import { Reveal } from "@/components/motion/reveal";

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
    <div
      data-theme="dark"
      className="aurora relative flex min-h-[100dvh] flex-col overflow-hidden bg-page text-ink"
    >
      {/* Drifting media layer — the frost below is only alive because this moves */}
      <div className="au-media" aria-hidden />

      <header className="relative z-10 border-b border-line px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Reveal effect="none" className="au-glass w-full max-w-md p-8 sm:p-10">
          <p
            className="au-eyebrow au-reveal inview"
            style={{ "--rv-delay": "100ms" } as React.CSSProperties}
          >
            Sign in
          </p>
          <h1 className="au-hl mt-3 text-4xl text-ink">
            <span className="au-lmask">
              <span style={{ transitionDelay: "250ms" }}>Open your</span>
            </span>
            <span className="au-lmask">
              <span style={{ transitionDelay: "350ms" }}>
                <span className="em">logbook</span>.
              </span>
            </span>
          </h1>
          <p
            className="au-reveal inview mt-4 max-w-[400px] text-sm leading-relaxed text-ink-2"
            style={{ "--rv-delay": "500ms" } as React.CSSProperties}
          >
            There are no passwords here. Enter your email and we send a one-time link.
            The same form signs you up if you are new.
          </p>

          {errorText && (
            <p className="mt-4 rounded-[8px] border border-out/25 bg-out-soft px-3 py-2 text-sm text-out">
              {errorText}
            </p>
          )}

          <div
            className="au-reveal inview mt-8"
            style={{ "--rv-delay": "650ms" } as React.CSSProperties}
          >
            <LoginForm next={next} />
          </div>

          <p className="au-mono mt-8 text-[10px] leading-[1.7] text-ink-3">
            bbiom tracks values you enter · no medical advice
            <br />
            discuss results with your healthcare provider
          </p>
        </Reveal>
      </main>
    </div>
  );
}
