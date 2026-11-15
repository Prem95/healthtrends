// Tests run in Expo's Jest preset, which simulates the native modules.
//   __tests__/lib      pure logic (entry checks, doctor summary, formatting)
//   __tests__/screens  the real screens, rendered and operated like a user would,
//                      with the network layer (src/lib/api.ts) replaced by fixtures
// Path aliases (@/…, @domain) come from tsconfig.json through the preset.
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  // ../src/lib/domain lives outside this folder; let its imports (and the
  // Babel helpers injected into it) resolve from the app's node_modules.
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  // More specific alias first (Metro picks the longest match; Jest picks the first).
  moduleNameMapper: { '^@/assets/(.*)$': '<rootDir>/assets/$1' },
  setupFiles: ['<rootDir>/__tests__/support/setup.tsx'],
};
