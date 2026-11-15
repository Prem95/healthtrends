import { Stack } from 'expo-router';

import { QueryState } from '@/components/ui/primitives';
import { PurchasesProvider } from '@/lib/purchases';
import { useProfiles } from '@/lib/queries';
import { colors } from '@/theme/tokens';

/*
  Everything behind sign-in. A new account has no profile yet, so the first
  profile is a gate of its own: until one exists only `onboarding` is
  reachable.
*/
export default function AppLayout() {
  const profiles = useProfiles();

  if (profiles.isPending || profiles.isError) {
    return <QueryState loading={profiles.isPending} error={profiles.error} onRetry={() => profiles.refetch()} />;
  }
  const hasProfile = profiles.data.length > 0;

  return (
    <PurchasesProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.page },
          headerTintColor: colors.ink,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="marker/[id]" options={{ title: '' }} />
          <Stack.Screen name="add-results" options={{ presentation: 'modal', title: 'Add results' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </PurchasesProvider>
  );
}
