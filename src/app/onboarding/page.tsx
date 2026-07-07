import { redirect } from "next/navigation";
import { getUser, listProfiles } from "@/lib/data";
import { createProfile } from "@/app/app/actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Disclaimer } from "@/components/disclaimer";

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
    <div className="paper-grain flex min-h-full flex-col">
      <header className="px-6 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md animate-rise">
          <p className="text-sm font-medium tracking-wide text-brand-strong uppercase">
            One quick step
          </p>
          <h1 className="mt-2 font-display text-3xl text-ink">Create your first profile</h1>
          <p className="mt-2 text-sm text-ink-2">
            Sex and date of birth let us pick the right reference ranges. You can add family
            members later on the Pro plan.
          </p>

          {error && (
            <p className="mt-4 rounded-md border border-out/20 bg-out-soft/60 px-3 py-2 text-sm text-out">
              Something didn’t save. Please check the fields and try again.
            </p>
          )}

          <form action={createProfile} className="mt-6 space-y-4">
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
              Continue to dashboard
            </Button>
          </form>

          <div className="mt-8">
            <Disclaimer variant="inline" />
          </div>
        </div>
      </main>
    </div>
  );
}
