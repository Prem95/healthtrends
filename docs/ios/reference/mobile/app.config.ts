import type { ExpoConfig } from 'expo/config';

// One place for the identifiers that must match App Store Connect, the
// Supabase "Client IDs" list and the Edge Function secret APP_BUNDLE_ID.
const BUNDLE_ID = 'com.bbiom.app';

const config: ExpoConfig = {
  name: 'bbiom',
  slug: 'bbiom',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'bbiom',
  userInterfaceStyle: 'light',
  icon: './assets/images/icon.png',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    usesAppleSignIn: true,
    // HTTPS only; no custom cryptography. Answers the export-compliance
    // question once instead of on every upload.
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSFaceIDUsageDescription: 'Use Face ID to keep your results private when you open bbiom.',
    },
    entitlements: {
      // Files the app writes are unreadable while the phone is locked.
      'com.apple.developer.default-data-protection': 'NSFileProtectionComplete',
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      // Must agree with the App Privacy answers in App Store Connect
      // (docs/ios/10-build-release.md). Nothing is used for tracking.
      NSPrivacyCollectedDataTypes: [
        'NSPrivacyCollectedDataTypeEmailAddress',
        'NSPrivacyCollectedDataTypeName',
        'NSPrivacyCollectedDataTypeUserID',
        'NSPrivacyCollectedDataTypeHealth',
        'NSPrivacyCollectedDataTypePurchaseHistory',
      ].map((type) => ({
        NSPrivacyCollectedDataType: type,
        NSPrivacyCollectedDataTypeLinked: true,
        NSPrivacyCollectedDataTypeTracking: false,
        NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
      })),
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
      ],
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: '#F5F4EF', image: './assets/images/splash-icon.png', imageWidth: 96 },
    ],
    'expo-secure-store',
    'expo-apple-authentication',
    'expo-local-authentication',
    'expo-iap',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
