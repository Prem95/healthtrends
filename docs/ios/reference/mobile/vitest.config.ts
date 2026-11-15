import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests for the app's pure logic (src/lib/*.test.ts): entry checks, the
// doctor summary, formatting. Screens are checked on a device (docs/ios/12-qa.md).
export default defineConfig({
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, '../src/lib/domain/index.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
