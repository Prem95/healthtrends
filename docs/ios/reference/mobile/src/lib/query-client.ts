import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { File, Paths } from 'expo-file-system';

/*
  Server state lives in TanStack Query. The cache is also written to one file
  so the last-seen results open instantly and without signal (a consulting
  room in a basement is a real place).

  Where that file lives is a privacy decision:
    - the app's Caches directory: not included in iCloud or computer backups,
      and the system may delete it under storage pressure, which is fine for
      a cache;
    - protected by the app's NSFileProtectionComplete entitlement, so it is
      unreadable while the phone is locked;
    - deleted on sign-out and on account deletion.
*/

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      retry: 1,
      // Show what we have when offline instead of an error.
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online' },
  },
});

const cacheFile = () => new File(Paths.cache, 'bbiom-query-cache.json');

export function clearPersistedCache(): void {
  try {
    const file = cacheFile();
    if (file.exists) file.delete();
  } catch {
    // Nothing to remove.
  }
}

export const persister: Persister = {
  persistClient(client: PersistedClient) {
    try {
      const file = cacheFile();
      if (!file.exists) file.create();
      file.write(JSON.stringify(client));
    } catch {
      // A cache that cannot be written is not an error worth surfacing.
    }
  },
  async restoreClient() {
    try {
      const file = cacheFile();
      if (!file.exists) return undefined;
      return JSON.parse(await file.text()) as PersistedClient;
    } catch {
      clearPersistedCache();
      return undefined;
    }
  },
  removeClient() {
    clearPersistedCache();
  },
};

/** Bump when the shape of cached data changes; older caches are discarded. */
export const CACHE_BUSTER = 'v1';
