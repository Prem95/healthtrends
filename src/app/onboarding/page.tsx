import { redirect } from "next/navigation";
import { getUser, listProfiles } from "@/lib/data";
import { createProfile } from "@/app/app/actions";
import { AuthShell } from "@/components/auth/auth-shell";
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
    <AuthShell>
      <p className="eyebrow">One quick step</p>
      <h1 className="display mt-3 text-[2rem] text-ink sm:text-[2.5rem]">
        Who are these results for?
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">
        Sex and date of birth let bbiom pick the right reference ranges. You can add family
        members later on the Pro plan.
      </p>

      {error && (
        <p className="mt-5 rounded-lg bg-out-soft px-4 py-3 text-sm text-out-ink">
          That did not save. Check the fields and try again.
        </p>
      )}

      <form action={createProfile} className="mt-7 space-y-4">
        <div>
          <Label htmlFor="name">Profile name</Label>
          <Input id="name" name="name" required placeholder="e.g. Me" autoFocus />
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
        <Button type="submit" size="lg" className="w-full">
          Continue
        </Button>
      </form>

      <div className="mt-8">
        <Disclaimer variant="inline" />
      </div>
    </AuthShell>
  );
}
