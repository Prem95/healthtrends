import type { Biomarker, LifeEvent, Profile, RefRange, Sex, TestSession } from '@domain';

import type { ResultWithSession } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

/*
  Every read and write the app makes. Reads go straight to PostgREST and are
  filtered by row-level security; nothing here passes a user id as a filter
  the server would have to trust. Multi-row writes go through one RPC so they
  are atomic. Errors are thrown as ApiError with a stable `code` the UI maps
  to copy.
*/

export class ApiError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code);
  }
}

/** Database trigger messages the UI knows how to explain. */
const KNOWN = ['profile_limit', 'session_limit', 'date_in_future', 'too_many_results', 'invalid_results'];

function fail(error: { message: string; code?: string } | null): void {
  if (!error) return;
  const known = KNOWN.find((k) => error.message.includes(k));
  throw new ApiError(known ?? 'request_failed', error.message);
}

// ---------------------------------------------------------------- reads

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, sex, date_of_birth')
    .order('created_at', { ascending: true });
  fail(error);
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    sex: p.sex as Sex,
    dateOfBirth: p.date_of_birth ?? undefined,
  }));
}

export type CatalogBiomarker = Biomarker & { archived: boolean };

export async function getBiomarkers(): Promise<CatalogBiomarker[]> {
  const { data, error } = await supabase.from('biomarkers').select('*').order('name', { ascending: true });
  fail(error);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    aliases: r.aliases ?? [],
    category: r.category,
    canonicalUnit: r.canonical_unit,
    altUnits: r.alt_units ?? [],
    defaultRanges: r.default_ranges ?? [],
    isCustom: r.is_custom,
    archived: r.archived,
  }));
}

export async function getSessions(profileId: string): Promise<TestSession[]> {
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id, profile_id, date, lab_name, ordered_by, fasting, notes, created_at')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  fail(error);
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

export async function getResults(profileId: string): Promise<ResultWithSession[]> {
  const { data, error } = await supabase
    .from('test_results')
    .select(
      'id, session_id, biomarker_id, value, entered_unit, lab_range, flag_on_report, note, created_at, test_sessions!inner(profile_id, date, lab_name)',
    )
    .eq('test_sessions.profile_id', profileId);
  fail(error);
  return (data ?? []).map((r) => {
    const session = r.test_sessions as unknown as { date: string; lab_name: string | null };
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

export async function getLifeEvents(profileId: string): Promise<LifeEvent[]> {
  const { data, error } = await supabase
    .from('life_events')
    .select('id, profile_id, date, label')
    .eq('profile_id', profileId)
    .order('date', { ascending: true });
  fail(error);
  return (data ?? []).map((e) => ({ id: e.id, profileId: e.profile_id, date: e.date, label: e.label }));
}

export async function getWatched(profileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('watched_biomarkers')
    .select('biomarker_id')
    .eq('profile_id', profileId);
  fail(error);
  return (data ?? []).map((w) => w.biomarker_id);
}

export async function getCustomRanges(profileId: string): Promise<Record<string, RefRange>> {
  const { data, error } = await supabase
    .from('custom_ranges')
    .select('biomarker_id, min, max')
    .eq('profile_id', profileId);
  fail(error);
  const out: Record<string, RefRange> = {};
  for (const row of data ?? []) {
    const range: RefRange = {};
    if (row.min != null) range.min = Number(row.min);
    if (row.max != null) range.max = Number(row.max);
    if (range.min != null || range.max != null) out[row.biomarker_id] = range;
  }
  return out;
}

export async function getUnitPreferences(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('unit_preferences').select('biomarker_id, display_unit');
  fail(error);
  return Object.fromEntries((data ?? []).map((r) => [r.biomarker_id, r.display_unit]));
}

/** What the signed-in user is entitled to, computed in Postgres. */
export type Entitlement = {
  plan: 'free' | 'pro';
  source: 'app_store' | 'stripe' | null;
  stripeActive: boolean;
  appStoreActive: boolean;
  appStoreStatus: string | null;
  appStoreAutoRenew: boolean | null;
  appStoreProductId: string | null;
  expiresAt: string | null;
  maxProfiles: number;
  /** null = unlimited */
  maxSessions: number | null;
  profileCount: number;
  sessionCount: number;
};

export async function getEntitlement(): Promise<Entitlement> {
  const { data, error } = await supabase.rpc('my_entitlement');
  fail(error);
  return data as Entitlement;
}

// --------------------------------------------------------------- writes

export async function createProfile(input: { name: string; sex: Sex; dateOfBirth?: string }): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new ApiError('not_signed_in');
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      sex: input.sex,
      date_of_birth: input.dateOfBirth ?? null,
    })
    .select('id')
    .single();
  fail(error);
  return data!.id as string;
}

export async function updateProfile(
  id: string,
  input: { name: string; sex: Sex; dateOfBirth?: string },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ name: input.name.trim(), sex: input.sex, date_of_birth: input.dateOfBirth ?? null })
    .eq('id', id);
  fail(error);
}

/** One result, already converted to the marker's canonical unit by the caller. */
export type NewResult = {
  biomarkerId: string;
  /** canonical unit */
  value: number;
  enteredUnit: string;
  /** canonical unit */
  labRange: RefRange | null;
  note?: string;
};

export async function createSession(input: {
  profileId: string;
  date: string;
  labName?: string;
  orderedBy?: string;
  fasting?: boolean;
  notes?: string;
  results: NewResult[];
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_session_with_results', {
    p_profile_id: input.profileId,
    p_date: input.date,
    p_lab_name: input.labName ?? null,
    p_ordered_by: input.orderedBy ?? null,
    p_fasting: input.fasting ?? null,
    p_notes: input.notes ?? null,
    p_results: input.results.map((r) => ({
      biomarker_id: r.biomarkerId,
      value: r.value,
      entered_unit: r.enteredUnit,
      lab_range: r.labRange,
      flag_on_report: null,
      note: r.note ?? null,
    })),
  });
  fail(error);
  return data as string;
}

export async function deleteSession(id: string): Promise<void> {
  fail((await supabase.from('test_sessions').delete().eq('id', id)).error);
}

export async function deleteResult(id: string): Promise<void> {
  fail((await supabase.from('test_results').delete().eq('id', id)).error);
}

export async function addLifeEvent(input: { profileId: string; date: string; label: string }): Promise<void> {
  const { error } = await supabase
    .from('life_events')
    .insert({ profile_id: input.profileId, date: input.date, label: input.label.trim() });
  fail(error);
}

export async function deleteLifeEvent(id: string): Promise<void> {
  fail((await supabase.from('life_events').delete().eq('id', id)).error);
}

export async function setWatched(profileId: string, biomarkerId: string, watched: boolean): Promise<void> {
  const table = supabase.from('watched_biomarkers');
  const { error } = watched
    ? await table.upsert({ profile_id: profileId, biomarker_id: biomarkerId })
    : await table.delete().eq('profile_id', profileId).eq('biomarker_id', biomarkerId);
  fail(error);
}

/** Pass the canonical unit to clear the preference. */
export async function setDisplayUnit(biomarker: Biomarker, unit: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new ApiError('not_signed_in');
  const table = supabase.from('unit_preferences');
  const { error } =
    unit === biomarker.canonicalUnit
      ? await table.delete().eq('user_id', userId).eq('biomarker_id', biomarker.id)
      : await table.upsert({
          user_id: userId,
          biomarker_id: biomarker.id,
          display_unit: unit,
          updated_at: new Date().toISOString(),
        });
  fail(error);
}

/** `range` in canonical units; null clears the override. */
export async function setCustomRange(profileId: string, biomarkerId: string, range: RefRange | null): Promise<void> {
  const table = supabase.from('custom_ranges');
  const { error } =
    range == null || (range.min == null && range.max == null)
      ? await table.delete().eq('profile_id', profileId).eq('biomarker_id', biomarkerId)
      : await table.upsert({
          profile_id: profileId,
          biomarker_id: biomarkerId,
          min: range.min ?? null,
          max: range.max ?? null,
          updated_at: new Date().toISOString(),
        });
  fail(error);
}
