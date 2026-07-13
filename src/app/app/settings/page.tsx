import Link from "next/link";
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
    <div className="max-w-2xl space-y-14">
      <Reveal as="header">
        <h1 className="au-mono text-[13px] text-ink">Settings</h1>
        <p className="au-mono mt-2 text-[11px] text-ink-3">{user.email}</p>
      </Reveal>

      {error && ERROR_TEXT[error] && (
        <p className="rounded-[8px] border border-out/25 bg-out-soft px-3 py-2 text-sm text-out">
          {ERROR_TEXT[error]}
        </p>
      )}
      {upgraded && (
        <p className="rounded-[8px] border border-in-range/25 bg-in-range-soft px-3 py-2 text-sm text-ink">
          Payment received. Your plan flips to Pro when Stripe sends its confirmation,
          usually within seconds.
        </p>
      )}
      {upgrade === "doctor_summary" && (
        <p className="rounded-[8px] border border-borderline/25 bg-borderline-soft px-3 py-2 text-sm text-ink">
          The doctor-ready summary is a Pro feature. Your raw data is always exportable below,
          free.
        </p>
      )}

      {/* ---- Plan ---- */}
      <Section title="Plan">
        <div className="au-card p-5">
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
                    Up to 6 profiles, unlimited sessions, doctor summary.
                    {plan.currentPeriodEnd && (
                      <> Current period ends {formatDate(plan.currentPeriodEnd)}.</>
                    )}
                  </>
                ) : (
                  <>
                    1 profile · {sessionCount}/20 sessions used · CSV/JSON export always
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
                    Pro, $4.99/mo
                  </Button>
                </form>
                <form action={startCheckout}>
                  <input type="hidden" name="interval" value="yearly" />
                  <Button type="submit" variant="secondary" size="sm">
                    $39/yr
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
        subtitle={`${profiles.length} of ${plan.limits.maxProfiles} · each keeps separate history and reference ranges`}
      >
        <ul className="space-y-4">
          {profiles.map((p) => (
            <li key={p.id} className="au-card p-5">
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
          <details className="au-acc au-card mt-4 overflow-hidden rounded-xl">
            <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
              <span className="au-acc-plus au-mono text-[14px] text-ink-3" aria-hidden>
                +
              </span>
              <span className="au-mono text-[12px] text-ink-2">Add a family member</span>
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
        title="Custom biomarkers"
        subtitle="for anything the catalog does not cover · markers with results are archived, never deleted"
      >
        {customMarkers.length > 0 && (
          <ul className="au-card mb-4 overflow-hidden">
            {customMarkers.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 first:border-t-0"
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
                  <p className="au-mono mt-0.5 text-[10px] text-ink-3">
                    {CATEGORY_LABEL[b.category]} · {b.canonicalUnit}
                  </p>
                </div>
                {!b.archived && (
                  <form action={deleteOrArchiveBiomarker}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="au-mono cursor-pointer text-[10px] text-ink-3 transition-colors duration-300 hover:text-out"
                    >
                      Delete / archive
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <details className="au-acc au-card overflow-hidden rounded-xl">
          <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
            <span className="au-acc-plus au-mono text-[14px] text-ink-3" aria-hidden>
              +
            </span>
            <span className="au-mono text-[12px] text-ink-2">New custom biomarker</span>
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
                Create biomarker
              </Button>
            </div>
          </form>
        </details>
      </Section>

      {/* ---- Export ---- */}
      <Section
        title="Your data"
        subtitle="export and deletion are free-tier features, forever · your health data is yours"
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <a href="/api/export?format=json" download>
              ↓ Export JSON
            </a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href="/api/export?format=csv" download>
              ↓ Export CSV
            </a>
          </Button>
          {plan.limits.doctorSummary ? (
            <Button asChild variant="subtle" size="sm">
              <Link href="/app/summary">Doctor summary →</Link>
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
        <div className="au-card border-out/25 p-5">
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
      <h2 className="au-eyebrow border-t border-line pt-3">{title}</h2>
      {subtitle && <p className="au-mono mt-1 mb-4 text-[10px] text-ink-3/80">{subtitle}</p>}
      <div className={subtitle ? "" : "mt-4"}>{children}</div>
    </Reveal>
  );
}
