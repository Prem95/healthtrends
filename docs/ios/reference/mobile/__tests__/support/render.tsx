import type { jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

/** Render a screen with a fresh query cache, as the app's root layout provides one. */
export function renderScreen(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** A mocked module function, loosely typed for call assertions (React Query passes a context argument). */
export function mocked(fn: unknown): jest.Mock {
  return fn as jest.Mock;
}
