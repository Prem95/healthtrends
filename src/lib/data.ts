import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type {
  Biomarker,
  LifeEvent,
  Profile,
  RefRange,
  TestResult,
  TestSession,
} from "@/lib/domain";

const ACTIVE_PROFILE_COOKIE = "ht_profile";

// ---- Row → domain mappers ----
type BiomarkerRow = {
  id: string;
  name: string;
  aliases: string[] | null;
  category: Biomarker["category"];
  canonical_unit: string;
  alt_units: Biomarker["altUnits"] | null;
  default_ranges: RefRange[] | null;
  is_custom: boolean;
  archived: boolean;
  user_id: string | null;
};

export function mapBiomarker(r: BiomarkerRow): Biomarker & { archived: boolean } {
  return {
    id: r.id,
    name: r.name,
    aliases: r.aliases ?? [],
    category: r.category,
    canonicalUnit: r.canonical_unit,
    altUnits: r.alt_units ?? [],
    defaultRanges: r.default_ranges ?? [],
    isCustom: r.is_custom,
    archived: r.archived,
  };
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, sex, date_of_birth")
    .order("created_at", { ascending: true });
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sex: p.sex,
    dateOfBirth: p.date_of_birth ?? undefined,
  }));
}

export async function getActiveProfile(): Promise<Profile | null> {
  const profiles = await listProfiles();
  if (profiles.length === 0) return null;
  const store = await cookies();
  const preferred = store.get(ACTIVE_PROFILE_COOKIE)?.value;
  return profiles.find((p) => p.id === preferred) ?? profiles[0];
}

export async function getBiomarkers(): Promise<(Biomarker & { archived: boolean })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("biomarkers")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []).map((r) => mapBiomarker(r as BiomarkerRow));
}

export async function getBiomarker(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("biomarkers").select("*").eq("id", id).maybeSingle();
  return data ? mapBiomarker(data as BiomarkerRow) : null;
}

export async function getSessions(profileId: string): Promise<TestSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("test_sessions")
    .select("id, profile_id, date, lab_name, ordered_by, fasting, notes, created_at")
    .eq("profile_id", profileId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((s) => ({
    id: s.id,
    profileId: s.profile_id,
    date: s.date,
    labName: s.lab_name ?? undefined,
    orderedBy: s.ordered_by ?? undefined,
    fasting: s.fasting ?? undefined,
    notes: s.notes ?? undefined,
    createdAt: s.created_at ?? undefined,
  }));
}

export type ResultWithSession = TestResult & {
  sessionDate: string;
  labName?: string;
  createdAt?: string;
};

/** All results for a profile, joined with their session date/lab. */
export async function getResults(profileId: string): Promise<ResultWithSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("test_results")
    .select(
      "id, session_id, biomarker_id, value, entered_unit, lab_range, flag_on_report, note, created_at, test_sessions!inner(profile_id, date, lab_name)",
    )
    .eq("test_sessions.profile_id", profileId);
  return (data ?? []).map((r) => {
    const session = (r as unknown as { test_sessions: { date: string; lab_name: string | null } })
      .test_sessions;
    return {
      id: r.id,
      sessionId: r.session_id,
      biomarkerId: r.biomarker_id,
      value: Number(r.value),
      enteredUnit: r.entered_unit,
      labRange: (r.lab_range as RefRange | null) ?? null,
      flagOnReport: r.flag_on_report ?? null,
      note: r.note ?? null,
      sessionDate: session.date,
      labName: session.lab_name ?? undefined,
      createdAt: r.created_at ?? undefined,
    };
  });
}

export async function getSessionWithResults(sessionId: string) {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("test_sessions")
    .select("id, profile_id, date, lab_name, ordered_by, fasting, notes")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;
  const { data: results } = await supabase
    .from("test_results")
    .select("id, session_id, biomarker_id, value, entered_unit, lab_range, flag_on_report, note")
    .eq("session_id", sessionId);
  return { session, results: results ?? [] };
}

export async function getLifeEvents(profileId: string): Promise<LifeEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("life_events")
    .select("id, profile_id, date, label")
    .eq("profile_id", profileId)
    .order("date", { ascending: true });
  return (data ?? []).map((e) => ({
    id: e.id,
    profileId: e.profile_id,
    date: e.date,
    label: e.label,
  }));
}

export async function getWatched(profileId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("watched_biomarkers")
    .select("biomarker_id")
    .eq("profile_id", profileId);
  return (data ?? []).map((w) => w.biomarker_id);
}

/** Count of all sessions across the user's profiles — for free-tier limits. */
export async function countAllSessions(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("test_sessions")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export { ACTIVE_PROFILE_COOKIE };
