import { jest } from '@jest/globals';

/* What usePurchases() returns in tests. Tests replace fields to set up a case. */
export const purchases = {
  products: [] as { id: string; displayPrice: string }[],
  ready: true,
  busy: false,
  notice: null as string | null,
  buy: jest.fn(async (_sku: string) => undefined),
  restore: jest.fn(async () => undefined),
  manage: jest.fn(async () => undefined),
  clearNotice: jest.fn(),
};
