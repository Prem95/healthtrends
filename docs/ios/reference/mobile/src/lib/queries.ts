import type { Profile } from '@domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { summarize, type BiomarkerSummary } from '@/lib/analytics';
import * as api from '@/lib/api';
import { prefs } from '@/lib/secure-storage';

/*
  Query hooks. Keys are namespaced so one mutation can invalidate exactly what
  it changed:
    ['profiles']                      the account's profiles
    ['entitlement']                   plan + limits
    ['catalog']                       biomarkers (built-in + custom)
    ['unit-prefs']                    display units
    ['profile', id, 'record']         everything for one profile, summarised
*/

export const keys = {
  profiles: ['profiles'] as const,
  entitlement: ['entitlement'] as const,
  catalog: ['catalog'] as const,
  unitPrefs: ['unit-prefs'] as const,
  record: (profileId: string) => ['profile', profileId, 'record'] as const,
};

export function useProfiles() {
  return useQuery({ queryKey: keys.profiles, queryFn: api.listProfiles });
}

export function useEntitlement() {
  return useQuery({ queryKey: keys.entitlement, queryFn: api.getEntitlement, staleTime: 30_000 });
}

export function useCatalog() {
  // The catalog changes only when the user adds a custom marker.
  return useQuery({ queryKey: keys.catalog, queryFn: api.getBiomarkers, staleTime: 60 * 60_000 });
}

export function useUnitPrefs() {
  return useQuery({ queryKey: keys.unitPrefs, queryFn: api.getUnitPreferences });
}

/** The profile being viewed: the remembered one if it still exists, else the first. */
export function useActiveProfile(): {
  profile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  setActive: (id: string) => void;
} {
  const { data: profiles, isPending } = useProfiles();
  const [preferred, setPreferred] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    prefs.get('active-profile').then((id) => setPreferred(id));
  }, []);

  const list = profiles ?? [];
  const profile = list.find((p) => p.id === preferred) ?? list[0] ?? null;
  return {
    profile,
    profiles: list,
    loading: isPending || preferred === undefined,
    setActive: (id: string) => {
      setPreferred(id);
      prefs.set('active-profile', id);
    },
  };
}

export type ProfileRecord = {
  summaries: BiomarkerSummary[];
  sessions: Awaited<ReturnType<typeof api.getSessions>>;
  events: Awaited<ReturnType<typeof api.getLifeEvents>>;
  watched: string[];
  customRanges: Awaited<ReturnType<typeof api.getCustomRanges>>;
};

/**
 * Everything the screens need for one profile, fetched together and run
 * through the shared domain rules once. Screens select from this; none of
 * them compute status or trend themselves.
 */
export function useProfileRecord(profile: Profile | null) {
  const catalog = useCatalog();
  return useQuery({
    queryKey: keys.record(profile?.id ?? 'none'),
    enabled: !!profile && !!catalog.data,
    queryFn: async (): Promise<ProfileRecord> => {
      const p = profile!;
      const [results, sessions, events, watched, customRanges] = await Promise.all([
        api.getResults(p.id),
        api.getSessions(p.id),
        api.getLifeEvents(p.id),
        api.getWatched(p.id),
        api.getCustomRanges(p.id),
      ]);
      return {
        summaries: summarize(results, catalog.data!, p.sex, customRanges),
        sessions,
        events,
        watched,
        customRanges,
      };
    },
  });
}

/** Wraps a write so the affected profile, and the limits, refresh afterwards. */
export function useRecordMutation<TInput>(profileId: string | undefined, fn: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (profileId) client.invalidateQueries({ queryKey: keys.record(profileId) });
      client.invalidateQueries({ queryKey: keys.entitlement });
    },
  });
}

export function useCreateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createProfile,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.profiles });
      client.invalidateQueries({ queryKey: keys.entitlement });
    },
  });
}
