import Link from "next/link";
import { Download, FileText, Plus } from "lucide-react";
import { getUser, listProfiles, getBiomarkers, countAllSessions } from "@/lib/data";
import { getPlan } from "@/lib/entitlements";
import { updateProfile, createProfile, createCustomBiomarker, deleteOrArchiveBiomarker } from "@/app/app/actions";
import { startCheckout, openBillingPortal } from "./billing-actions";
import { deleteAccount } from "./account-actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/status-badge";
import { Reveal } from "@/components/motion/reveal";
import { formatDate } from "@/lib/utils";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/domain";

const ERROR_TEXT: Record<string, string> = {
  profile_limit: "This plan is at its profile limit. Pro allows up to 6 profiles.",
  invalid: "A field did not validate. Check the values and try again.",
  save: "Could not save. Try again.",
  billing_unconfigured: "Billing is not configured on this deployment yet.",
  billing: "Stripe checkout could not be started. Try again.",
  no_customer: "No billing profile yet. Upgrade first.",
  confirm_delete: "Type DELETE (all caps) to confirm account deletion.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; upgraded?: string; upgrade?: string }>;
}) {
  const { error, upgraded, upgrade } = await searchParams;
  const user = (await getUser())!;
  const [profiles, biomarkers, plan, sessionCount] = await Promise.all([
    listProfiles(),
    getBiomarkers(),
    getPlan(user.id),
    countAllSessions(),
  ]);
  const customMarkers = biomarkers.filter((b) => b.isCustom);
  const canAddProfile = profiles.length < plan.limits.maxProfiles;

  return (
    <div className="max-w-3xl space-y-10">
      <Reveal as="header">
        <h1 className="display text-[1.75rem] text-ink sm:text-[2rem]">Settings</h1>
        <p className="mt-1.5 text-sm text-ink-3">Signed in as {user.email}</p>
      </Reveal>

      {error && ERROR_TEXT[error] && (
        <p className="rounded-lg bg-out-soft px-4 py-3 text-sm text-out-ink">
          {ERROR_TEXT[error]}
        </p>
      )}
      {upgraded && (
        <p className="rounded-lg bg-in-range-soft px-4 py-3 text-sm text-ink">
          Payment received. Your plan flips to Pro when Stripe sends its confirmation,
          usually within seconds.
        </p>
      )}
      {upgrade === "doctor_summary" && (
        <p className="rounded-lg bg-borderline-soft px-4 py-3 text-sm text-ink">
          The doctor-ready summary is a Pro feature. Your raw data is always exportable below,
          free.
        </p>
      )}

      {/* ---- Plan ---- */}
      <Section title="Plan">
        <div className="card-quiet p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2.5 font-medium text-ink">
                {plan.plan === "pro" ? "Pro" : "Free"}
                {plan.plan === "pro" && <Badge tone="brand">Active</Badge>}
                {plan.pastDue && <Badge tone="borderline">Payment failed</Badge>}
              </p>
              <p className="mt-1.5 max-w-[400px] text-sm leading-relaxed text-ink-2">
                {plan.plan === "pro" ? (
                  <>
                    Up to 6 profiles, unlimited tests, doctor summary.
                    {plan.currentPeriodEnd && (
                      <> Current period ends {formatDate(plan.currentPeriodEnd)}.</>
                    )}
                  </>
                ) : (
                  <>
                    1 profile · {sessionCount} of 20 tests used · CSV and JSON export always
                    included.
                  </>
                )}
              </p>
            </div>
            {plan.plan === "pro" ? (
              <form action={openBillingPortal}>
                <Button type="submit" variant="secondary" size="sm">
                  Manage billing
                </Button>
              </form>
            ) : (
              <div className="flex gap-2">
                <form action={startCheckout}>
                  <input type="hidden" name="interval" value="monthly" />
                  <Button type="submit" size="sm">
                    Go Pro · $4.99 a month
                  </Button>
                </form>
                <form action={startCheckout}>
                  <input type="hidden" name="interval" value="yearly" />
                  <Button type="submit" variant="secondary" size="sm">
                    $39 a year
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ---- Profiles ---- */}
      <Section
        title="Profiles"
        subtitle={`${profiles.length} of ${plan.limits.maxProfiles} used. Each profile keeps its own history and reference ranges.`}
      >
        <ul className="space-y-3">
          {profiles.map((p) => (
            <li key={p.id} className="card p-5">
              <form action={updateProfile} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={p.id} />
                <div className="min-w-40 flex-1">
                  <Label htmlFor={`name-${p.id}`}>Name</Label>
                  <Input id={`name-${p.id}`} name="name" defaultValue={p.name} required />
                </div>
                <div>
                  <Label htmlFor={`sex-${p.id}`}>Sex</Label>
                  <Select id={`sex-${p.id}`} name="sex" defaultValue={p.sex}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`dob-${p.id}`}>Date of birth</Label>
                  <Input
                    id={`dob-${p.id}`}
                    name="dateOfBirth"
                    type="date"
                    defaultValue={p.dateOfBirth ?? ""}
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Save
                </Button>
              </form>
            </li>
          ))}
        </ul>

        {canAddProfile ? (
          <details className="acc card mt-3 overflow-hidden">
            <summary className="flex items-center gap-3 px-5 py-4">
              <span className="flex-1 text-sm font-medium text-ink">Add a family member</span>
              <Plus className="acc-mark size-4 text-ink-3" aria-hidden />
            </summary>
            <form action={createProfile} className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-4">
              <div className="min-w-40 flex-1">
                <Label htmlFor="new-name">Name</Label>
                <Input id="new-name" name="name" required placeholder="e.g. Dad" />
              </div>
              <div>
                <Label htmlFor="new-sex">Sex</Label>
                <Select id="new-sex" name="sex" defaultValue="OTHER">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-dob">Date of birth</Label>
                <Input id="new-dob" name="dateOfBirth" type="date" />
              </div>
              <Button type="submit" size="sm">
                Create profile
              </Button>
            </form>
          </details>
        ) : (
          plan.plan === "free" && (
            <p className="mt-3 text-sm text-ink-3">
              The Free plan includes one profile. Pro adds up to six for family tracking.
            </p>
          )
        )}
      </Section>

      {/* ---- Custom biomarkers ---- */}
      <Section
        title="Custom markers"
        subtitle="For anything the catalog does not cover. A marker that already has results is archived, never deleted."
      >
        {customMarkers.length > 0 && (
          <ul className="card mb-3 divide-y divide-line overflow-hidden">
            {customMarkers.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Link
                      href={`/app/biomarkers/${b.id}`}
                      className="transition-colors duration-300 hover:text-brand"
                    >
                      {b.name}
                    </Link>
                    {b.archived && <Badge>Archived</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {CATEGORY_LABEL[b.category]} · {b.canonicalUnit}
                  </p>
                </div>
                {!b.archived && (
                  <form action={deleteOrArchiveBiomarker}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="cursor-pointer text-xs text-ink-3 underline-offset-2 transition-colors duration-300 hover:text-out-ink hover:underline"
                    >
                      Delete or archive
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <details className="acc card overflow-hidden">
          <summary className="flex items-center gap-3 px-5 py-4">
            <span className="flex-1 text-sm font-medium text-ink">New custom marker</span>
            <Plus className="acc-mark size-4 text-ink-3" aria-hidden />
          </summary>
          <form action={createCustomBiomarker} className="grid gap-3 border-t border-line px-5 py-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cb-name">Name</Label>
              <Input id="cb-name" name="name" required placeholder="e.g. Omega-3 Index" />
            </div>
            <div>
              <Label htmlFor="cb-unit">Unit</Label>
              <Input id="cb-unit" name="canonicalUnit" required placeholder="e.g. %" />
            </div>
            <div>
              <Label htmlFor="cb-cat">Category</Label>
              <Select id="cb-cat" name="category" defaultValue="OTHER">
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cb-min">Range min</Label>
                <Input id="cb-min" name="rangeMin" inputMode="decimal" placeholder="optional" />
              </div>
              <div>
                <Label htmlFor="cb-max">Range max</Label>
                <Input id="cb-max" name="rangeMax" inputMode="decimal" placeholder="optional" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm">
                Create marker
              </Button>
            </div>
          </form>
        </details>
      </Section>

      {/* ---- Export ---- */}
      <Section
        title="Your data"
        subtitle="Export and deletion are free on every plan. Your health data is yours."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href="/api/export?format=json" download>
              <Download aria-hidden /> Export JSON
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href="/api/export?format=csv" download>
              <Download aria-hidden /> Export CSV
            </a>
          </Button>
          {plan.limits.doctorSummary ? (
            <Button asChild variant="subtle" size="sm">
              <Link href="/app/summary">
                <FileText aria-hidden /> Doctor summary
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled title="Pro feature">
              Doctor summary (Pro)
            </Button>
          )}
        </div>
      </Section>

      {/* ---- Danger zone ---- */}
      <Section title="Delete account">
        <div className="card border-out/40 p-5">
          <p className="max-w-[560px] text-sm leading-relaxed text-ink-2">
            Permanently removes every profile, session, result, life event and custom marker,
            cancels any subscription, and deletes your sign-in. There is no undo, so export
            your data first if you want a copy.
          </p>
          <form action={deleteAccount} className="mt-5 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="confirm-delete">Type DELETE to confirm</Label>
              <Input id="confirm-delete" name="confirm" placeholder="DELETE" className="w-40" autoComplete="off" />
            </div>
            <Button type="submit" variant="danger" size="md">
              Delete my account
            </Button>
          </form>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal as="section">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-[0.8125rem] text-ink-3">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </Reveal>
  );
}
