import { redirect } from "next/navigation";
import { getUser, listProfiles } from "@/lib/data";
import { createProfile } from "@/app/app/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Disclaimer } from "@/components/disclaimer";
import { Reveal } from "@/components/motion/reveal";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?next=/onboarding");
  const profiles = await listProfiles();
  if (profiles.length > 0) redirect("/app");

  return (
    <div
      data-theme="light"
      className="aurora relative flex min-h-[100dvh] flex-col overflow-hidden bg-page text-ink"
    >
      <div className="au-media" aria-hidden />

      <header className="relative z-10 border-b border-line px-6 py-4">
        <Logo />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <Reveal effect="none" className="au-glass w-full max-w-md p-8 sm:p-10">
          <p
            className="au-eyebrow au-reveal inview"
            style={{ "--rv-delay": "100ms" } as React.CSSProperties}
          >
            One quick step
          </p>
          <h1 className="au-hl mt-3 text-4xl text-ink">
            <span className="au-lmask">
              <span style={{ transitionDelay: "250ms" }}>Create your first</span>
            </span>
            <span className="au-lmask">
              <span style={{ transitionDelay: "350ms" }}>
                <span className="em">profile</span>.
              </span>
            </span>
          </h1>
          <p
            className="au-reveal inview mt-4 max-w-[400px] text-sm leading-relaxed text-ink-2"
            style={{ "--rv-delay": "500ms" } as React.CSSProperties}
          >
            Sex and date of birth let us pick the right reference ranges. You can add family
            members later on the Pro plan.
          </p>

          {error && (
            <p className="mt-4 rounded-[8px] border border-out/25 bg-out-soft px-3 py-2 text-sm text-out">
              That did not save. Check the fields and try again.
            </p>
          )}

          <form
            action={createProfile}
            className="au-reveal inview mt-8 space-y-4"
            style={{ "--rv-delay": "650ms" } as React.CSSProperties}
          >
            <div>
              <Label htmlFor="name">Profile name</Label>
              <Input id="name" name="name" required placeholder="e.g. Myself" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Select id="sex" name="sex" defaultValue="OTHER" required>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="OTHER">Other / prefer not to say</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Continue to markers
            </Button>
          </form>

          <div className="mt-8">
            <Disclaimer variant="inline" />
          </div>
        </Reveal>
      </main>
    </div>
  );
}
