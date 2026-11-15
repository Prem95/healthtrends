import { jest } from '@jest/globals';

/* Module stand-ins for every test: the network layer, the session, StoreKit,
   and the few native views the Jest preset does not simulate. */

jest.mock('@/lib/api', () => require('./mock-api'));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/secure-storage', () => ({
  prefs: { get: jest.fn(async () => null), set: jest.fn(async () => undefined), remove: jest.fn(async () => undefined) },
  secureStorage: {},
}));
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ session: { user: { id: 'u1', email: 'sam@example.com' } }, loading: false }),
  signOut: jest.fn(),
  deleteAccount: jest.fn(async () => ({ appStoreSubscriptionActive: false })),
}));
jest.mock('@/lib/purchases', () => {
  // Real constants and copy; StoreKit state comes from support/purchases.ts.
  const actual = jest.requireActual<typeof import('@/lib/purchases')>('@/lib/purchases');
  const { purchases } = require('./purchases');
  return { ...actual, usePurchases: () => purchases };
});
jest.mock('@/lib/app-lock', () => ({
  useAppLock: () => ({ enabled: false, available: true, setEnabled: jest.fn(async () => true) }),
}));
jest.mock('@/lib/export', () => ({ exportData: jest.fn(async () => undefined) }));

jest.mock('expo-router', () => {
  const router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  const Stack = Object.assign(({ children }: { children?: unknown }) => children ?? null, {
    Screen: () => null,
    Protected: ({ children }: { children?: unknown }) => children ?? null,
  });
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    Link: ({ children }: { children: unknown }) => children,
    Stack,
    usePreventRemove: jest.fn(),
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  // A text field standing in for the native picker: type "2026-09-01" to pick a date.
  const { TextInput } = require('react-native');
  return ({
    value,
    accessibilityLabel,
    onValueChange,
  }: {
    value: Date;
    accessibilityLabel?: string;
    onValueChange?: (event: unknown, date: Date) => void;
  }) => (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      value={`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`}
      onChangeText={(text: string) => {
        const [y, m, d] = text.split('-').map(Number);
        onValueChange?.({ nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(y, m - 1, d));
      }}
    />
  );
});
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
