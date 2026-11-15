import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { prefs } from '@/lib/secure-storage';
import { colors, radius, space, type } from '@/theme/tokens';

/*
  Two separate protections for a screen full of medical results:

  1. Privacy cover. Whenever the app is not active (app switcher, a call
     banner, Control Centre) an opaque cover replaces the content, so results
     never appear in the multitasking snapshot.
  2. App lock (opt-in in Settings). After the app has been in the background
     for more than a minute, Face ID / Touch ID / passcode is required again.
*/

const RELOCK_AFTER_MS = 60_000;

type AppLock = {
  /** null while the saved setting is loading */
  enabled: boolean | null;
  available: boolean;
  setEnabled: (on: boolean) => Promise<boolean>;
};

const AppLockContext = createContext<AppLock>({ enabled: null, available: false, setEnabled: async () => false });

async function authenticate(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: reason });
  return result.success;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean | null>(null);
  const [available, setAvailable] = useState(false);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(AppState.currentState !== 'active');
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  useEffect(() => {
    (async () => {
      const [saved, hardware, enrolled] = await Promise.all([
        prefs.get('app-lock'),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      const on = saved === 'on';
      setAvailable(hardware && enrolled);
      setEnabledState(on);
      if (on) setLocked(true); // cold start
    })();
  }, []);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      if (await authenticate('Unlock bbiom')) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setCovered(false);
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabled && since != null && Date.now() - since > RELOCK_AFTER_MS) setLocked(true);
      } else {
        setCovered(true);
        if (state === 'background' && backgroundedAt.current == null) backgroundedAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [enabled]);

  // Ask as soon as the lock is showing and the app is in front.
  useEffect(() => {
    if (locked && !covered) unlock();
  }, [locked, covered, unlock]);

  const setEnabled = useCallback(async (on: boolean) => {
    // Turning the lock on or off itself needs the owner of the phone.
    if (!(await authenticate(on ? 'Turn on app lock' : 'Turn off app lock'))) return false;
    await prefs.set('app-lock', on ? 'on' : 'off');
    setEnabledState(on);
    return true;
  }, []);

  return (
    <AppLockContext value={{ enabled, available, setEnabled }}>
      {children}
      {(locked || covered) && (
        <View style={styles.cover} accessibilityViewIsModal>
          <Text style={styles.brand}>bbiom</Text>
          {locked && !covered && (
            <Pressable onPress={unlock} style={styles.unlock} accessibilityRole="button">
              <Text style={styles.unlockLabel}>Unlock</Text>
            </Pressable>
          )}
        </View>
      )}
    </AppLockContext>
  );
}

export function useAppLock() {
  return use(AppLockContext);
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.page,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
  },
  brand: { ...type.title1, color: colors.ink },
  unlock: {
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
  },
  unlockLabel: { ...type.headline, color: colors.page },
});
