import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppLockProvider } from '@/lib/app-lock';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CACHE_BUSTER, persister, queryClient } from '@/lib/query-client';

// Keep the splash up until we know whether someone is signed in, so the
// sign-in screen never flashes in front of a returning user.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER, maxAge: 7 * 24 * 60 * 60 * 1000 }}
    >
      <AuthProvider>
        <AppLockProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppLockProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  // Protected groups: a signed-out user cannot reach (app) by any link, and a
  // signed-in user is moved out of (auth) the moment the session appears.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
