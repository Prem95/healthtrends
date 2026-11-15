import * as SecureStore from 'expo-secure-store';

/*
  Keychain-backed storage for the Supabase session.

  The session (access + refresh token) is the key to someone's medical
  history, so it lives in the iOS Keychain, readable only while the phone is
  unlocked and never copied to another device or an iCloud backup. Values are
  split into chunks because a session with provider tokens can be several
  kilobytes and Keychain items are happiest small.
*/

const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

// SecureStore keys allow only [A-Za-z0-9._-].
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function clear(key: string): Promise<void> {
  const count = Number((await SecureStore.getItemAsync(`${key}.n`, OPTIONS)) ?? '0');
  await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS)),
  );
  await SecureStore.deleteItemAsync(`${key}.n`, OPTIONS);
}

export const secureStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safe(rawKey);
    const count = Number((await SecureStore.getItemAsync(`${key}.n`, OPTIONS)) ?? '0');
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`, OPTIONS)),
    );
    // A missing chunk means a write was interrupted: treat as signed out.
    return parts.some((p) => p == null) ? null : parts.join('');
  },

  async setItem(rawKey: string, value: string): Promise<void> {
    const key = safe(rawKey);
    await clear(key);
    const count = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
    }
    await SecureStore.setItemAsync(`${key}.n`, String(count), OPTIONS);
  },

  async removeItem(rawKey: string): Promise<void> {
    await clear(safe(rawKey));
  },
};

/** Small non-secret preferences (active profile, app-lock switch). */
export const prefs = {
  get: (key: string) => SecureStore.getItemAsync(`pref.${key}`, OPTIONS),
  set: (key: string, value: string) => SecureStore.setItemAsync(`pref.${key}`, value, OPTIONS),
  remove: (key: string) => SecureStore.deleteItemAsync(`pref.${key}`, OPTIONS),
};
