"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/entitlements";
import { getUser } from "@/lib/data";
import {
  profileSchema,
  sessionSchema,
  resultInputSchema,
  lifeEventSchema,
  customBiomarkerSchema,
} from "@/lib/validation";
import {
  conversionFactor,
  checkPlausibility,
  type Biomarker,
  type RefRange,
} from "@/lib/domain";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/data";

async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// -------------------- Profiles --------------------

export async function createProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    sex: formData.get("sex"),
    dateOfBirth: formData.get("dateOfBirth") ?? "",
  });
  if (!parsed.success) redirect("/onboarding?error=invalid");

  const supabase = await createClient();

  // Enforce plan profile cap.
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const plan = await getPlan(user.id);
  if ((count ?? 0) >= plan.limits.maxProfiles) {
    redirect("/app/settings?error=profile_limit");
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      sex: parsed.data.sex,
      date_of_birth: parsed.data.dateOfBirth ?? null,
    })
    .select("id")
    .single();
  if (error || !data) redirect("/onboarding?error=save");

  const store = await cookies();
  store.set(ACTIVE_PROFILE_COOKIE, data.id, { path: "/", httpOnly: false, sameSite: "lax" });
  revalidatePath("/app");
  redirect("/app");
}

export async function updateProfile(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    sex: formData.get("sex"),
    dateOfBirth: formData.get("dateOfBirth") ?? "",
  });
  if (!parsed.success) redirect("/app/settings?error=invalid");
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      sex: parsed.data.sex,
      date_of_birth: parsed.data.dateOfBirth ?? null,
    })
    .eq("id", id);
  revalidatePath("/app");
  redirect("/app/settings");
}

export async function setActiveProfile(profileId: string): Promise<void> {
  await requireUser();
  const store = await cookies();
  store.set(ACTIVE_PROFILE_COOKIE, profileId, { path: "/", httpOnly: false, sameSite: "lax" });
  revalidatePath("/app");
}

// -------------------- Sessions + Results --------------------

// Client sends the whole session with an array of result rows as JSON.
const createSessionSchema = sessionSchema.extend({
  results: z.array(resultInputSchema).default([]),
  confirmedBiomarkerIds: z.array(z.string()).default([]),
});

export type SessionActionState = {
  ok?: boolean;
  error?: string;
  // rows that failed plausibility and need explicit confirmation
  needsConfirmation?: {
    biomarkerId: string;
    enteredValue: number;
    enteredUnit: string;
    suggestion?: { unit: string; canonicalValue: number } | null;
    reason?: string;
  }[];
  /** Markers that already have a result on this date (warn, don't block — §9.3.5). */
  duplicateBiomarkerIds?: string[];
  sessionId?: string;
};

function rangeToCanonical(
  biomarker: Pick<Biomarker, "canonicalUnit" | "altUnits">,
  unit: string,
  min?: number,
  max?: number,
): RefRange | null {
  if (min == null && max == null) return null;
  const factor = conversionFactor(biomarker, unit) ?? 1;
  const range: RefRange = {};
  if (min != null) range.min = min * factor;
  if (max != null) range.max = max * factor;
  return range;
}

export async function createSession(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const user = await requireUser();
  const raw = formData.get("payload");
  let payload: unknown;
  try {
    payload = JSON.parse(typeof raw === "string" ? raw : "{}");
  } catch {
    return { error: "Malformed submission." };
  }
  const parsed = createSessionSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const input = parsed.data;

  const supabase = await createClient();

  // Free-tier session cap (total across profiles). Over-limit → read-only.
  const plan = await getPlan(user.id);
  if (Number.isFinite(plan.limits.maxSessions)) {
    const { count } = await supabase
      .from("test_sessions")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) >= plan.limits.maxSessions) {
      return { error: "You have reached the Free plan limit of 20 sessions. Upgrade to add more." };
    }
  }

  // Load biomarkers referenced by the rows for unit conversion + plausibility.
  const ids = [...new Set(input.results.map((r) => r.biomarkerId))];
  const { data: bmRows } = await supabase.from("biomarkers").select("*").in("id", ids);
  const bmMap = new Map<string, Biomarker>();
  for (const b of bmRows ?? []) {
    bmMap.set(b.id, {
      id: b.id,
      name: b.name,
      aliases: b.aliases ?? [],
      category: b.category,
      canonicalUnit: b.canonical_unit,
      altUnits: b.alt_units ?? [],
      defaultRanges: b.default_ranges ?? [],
      isCustom: b.is_custom,
    });
  }

  // Plausibility gate (skip rows the user already confirmed).
  const confirmed = new Set(input.confirmedBiomarkerIds);
  const needsConfirmation: NonNullable<SessionActionState["needsConfirmation"]> = [];
  for (const row of input.results) {
    const bm = bmMap.get(row.biomarkerId);
    if (!bm) return { error: `Unknown biomarker: ${row.biomarkerId}` };
    if (conversionFactor(bm, row.enteredUnit) == null) {
      return { error: `Unit "${row.enteredUnit}" is not valid for ${bm.name}.` };
    }
    if (confirmed.has(row.biomarkerId)) continue;
    const check = checkPlausibility(bm, row.value, row.enteredUnit);
    if (!check.plausible) {
      needsConfirmation.push({
        biomarkerId: row.biomarkerId,
        enteredValue: row.value,
        enteredUnit: row.enteredUnit,
        suggestion: check.suggestion,
        reason: check.reason,
      });
    }
  }
  if (needsConfirmation.length > 0) {
    return { needsConfirmation };
  }

  // Duplicate protection (§9.3.5): warn — never block — when a result for the
  // same biomarker already exists on the same session date for this profile.
  if (ids.length > 0) {
    const { data: existing } = await supabase
      .from("test_results")
      .select("biomarker_id, test_sessions!inner(profile_id, date)")
      .in("biomarker_id", ids)
      .eq("test_sessions.profile_id", input.profileId)
      .eq("test_sessions.date", input.date);
    const dupes = [
      ...new Set(
        (existing ?? [])
          .map((r) => r.biomarker_id as string)
          .filter((id) => !confirmed.has(id)),
      ),
    ];
    if (dupes.length > 0) {
      return { duplicateBiomarkerIds: dupes };
    }
  }

  // Insert the session, then the results (values converted to canonical).
  const { data: session, error: sErr } = await supabase
    .from("test_sessions")
    .insert({
      profile_id: input.profileId,
      date: input.date,
      lab_name: input.labName ?? null,
      ordered_by: input.orderedBy ?? null,
      fasting: input.fasting ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (sErr || !session) return { error: "Could not save the session." };

  if (input.results.length > 0) {
    const rows = input.results.map((row) => {
      const bm = bmMap.get(row.biomarkerId)!;
      const factor = conversionFactor(bm, row.enteredUnit) ?? 1;
      return {
        session_id: session.id,
        biomarker_id: row.biomarkerId,
        value: row.value * factor,
        entered_unit: row.enteredUnit,
        lab_range: rangeToCanonical(bm, row.enteredUnit, row.labRangeMin, row.labRangeMax),
        flag_on_report: row.flagOnReport ?? null,
        note: row.note ?? null,
      };
    });
    const { error: rErr } = await supabase.from("test_results").insert(rows);
    if (rErr) return { error: "Session saved, but some results failed to save." };
  }

  revalidatePath("/app");
  return { ok: true, sessionId: session.id };
}

export async function deleteSession(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  // Results cascade via FK on delete.
  await supabase.from("test_sessions").delete().eq("id", id);
  revalidatePath("/app");
  redirect("/app/timeline");
}

export async function deleteResult(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("test_results").delete().eq("id", id);
  revalidatePath("/app");
}

// -------------------- Life events --------------------

export async function addLifeEvent(formData: FormData): Promise<void> {
  await requireUser();
  const parsed = lifeEventSchema.safeParse({
    profileId: formData.get("profileId"),
    date: formData.get("date"),
    label: formData.get("label"),
  });
  if (!parsed.success) redirect("/app/timeline?error=invalid");
  const supabase = await createClient();
  await supabase.from("life_events").insert({
    profile_id: parsed.data.profileId,
    date: parsed.data.date,
    label: parsed.data.label,
  });
  revalidatePath("/app");
}

export async function deleteLifeEvent(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("life_events").delete().eq("id", id);
  revalidatePath("/app");
}

// -------------------- Watched --------------------

export async function toggleWatch(formData: FormData): Promise<void> {
  await requireUser();
  const profileId = z.string().uuid().parse(formData.get("profileId"));
  const biomarkerId = z.string().parse(formData.get("biomarkerId"));
  const watched = formData.get("watched") === "true";
  const supabase = await createClient();
  if (watched) {
    await supabase
      .from("watched_biomarkers")
      .delete()
      .eq("profile_id", profileId)
      .eq("biomarker_id", biomarkerId);
  } else {
    await supabase
      .from("watched_biomarkers")
      .insert({ profile_id: profileId, biomarker_id: biomarkerId });
  }
  revalidatePath("/app");
}

// -------------------- Custom biomarkers --------------------

export async function createCustomBiomarker(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = customBiomarkerSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    canonicalUnit: formData.get("canonicalUnit"),
    rangeMin: numOrUndef(formData.get("rangeMin")),
    rangeMax: numOrUndef(formData.get("rangeMax")),
  });
  if (!parsed.success) redirect("/app/settings?error=invalid");

  const slug =
    "custom-" +
    parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7);

  const ranges: RefRange[] = [];
  if (parsed.data.rangeMin != null || parsed.data.rangeMax != null) {
    ranges.push({
      ...(parsed.data.rangeMin != null ? { min: parsed.data.rangeMin } : {}),
      ...(parsed.data.rangeMax != null ? { max: parsed.data.rangeMax } : {}),
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("biomarkers").insert({
    id: slug,
    name: parsed.data.name,
    aliases: [],
    category: parsed.data.category,
    canonical_unit: parsed.data.canonicalUnit,
    alt_units: [],
    default_ranges: ranges,
    is_custom: true,
    user_id: user.id,
  });
  if (error) redirect("/app/settings?error=save");
  revalidatePath("/app");
}

/**
 * Deleting a custom biomarker is blocked while any result references it — we
 * archive instead so history and charts stay intact.
 */
export async function deleteOrArchiveBiomarker(formData: FormData): Promise<void> {
  await requireUser();
  const id = z.string().parse(formData.get("id"));
  const supabase = await createClient();

  const { count } = await supabase
    .from("test_results")
    .select("id", { count: "exact", head: true })
    .eq("biomarker_id", id);

  if ((count ?? 0) > 0) {
    await supabase.from("biomarkers").update({ archived: true }).eq("id", id);
  } else {
    await supabase.from("biomarkers").delete().eq("id", id);
  }
  revalidatePath("/app");
  redirect("/app/biomarkers");
}

function numOrUndef(v: FormDataEntryValue | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}
