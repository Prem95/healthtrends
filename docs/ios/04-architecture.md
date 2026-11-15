# 04 — Architecture

## 1. The shape of it

```
 iPhone app (Expo, React Native)
   │  publishable key + the user's JWT          ┌──────────────────────────┐
   ├──────────── PostgREST ───────────────────► │ Postgres                 │
   │   reads, writes, RPCs                      │  row-level security      │
   │                                            │  plan-limit triggers     │
   │  the user's JWT                            │  user_is_pro()           │
   ├──────────── Edge Functions ──────────────► │  apply_app_store_…()     │
   │   iap-confirm, delete-account              └──────────▲───────────────┘
   │                                                       │ secret key
   │  StoreKit 2 (expo-iap)                     ┌──────────┴───────────────┐
   └──────────── App Store ──────────────────►  │ Edge Functions           │
                    │                           │  iap-confirm             │
                    │ Server Notifications V2   │  app-store-notifications │
                    └─────────────────────────► │  delete-account          │
                                                └──────────┬───────────────┘
                                                           │ App Store Server API
                                                           ▼
                                                        Apple
```

Three decisions define the architecture:

1. **The app talks to Postgres directly**, through PostgREST, as the signed-in
   user. There is no API server to build or secure. This is only safe because
   every rule is enforced in the database: row-level security (who can see a
   row), triggers (plan limits), constraints (input sizes), and RPCs (atomic
   multi-row writes). Migration 0006 adds the parts that used to live only in
   the web server.
2. **The app is never trusted about money.** It reports a purchase; an Edge
   Function asks Apple; only the function, holding the secret key, can write
   subscription state. The app learns it is Pro by reading the database.
3. **Domain rules are shared, not copied.** Units, ranges, status, trend and
   plausibility live once in `src/lib/domain` and are imported by both the web
   app and the phone app.

## 2. Stack and pinned versions

Verified together (see the table in `README.md`). `npx expo install` keeps the
`~` packages matched to the SDK.

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | Expo SDK | 58 (`expo ~58.0.25`) |
| Runtime | React Native (New Architecture, Hermes) | 0.88.1 |
| UI | React | 19.3.0, React Compiler on |
| Language | TypeScript, strict | ~6.0.3 |
| Routing | `expo-router` (typed routes) | ~58.0.31 |
| Tabs | `expo-router/native-tabs` | same |
| Backend client | `@supabase/supabase-js` | ^2.119.0 |
| Server state | `@tanstack/react-query` + `-persist-client` | ^5.107.1 |
| Purchases | `expo-iap` (StoreKit 2, OpenIAP) | ^6.4.4 |
| Session storage | `expo-secure-store` (Keychain) | ~58.0.3 |
| Sign in with Apple | `expo-apple-authentication` | ~58.0.3 |
| Google sign-in sheet | `expo-web-browser` + `expo-linking` | ~58.0.8 / ~58.0.17 |
| App lock | `expo-local-authentication` | ~58.0.3 |
| Charts and glyphs | `react-native-svg` | 15.16.0 |
| Art, blur, glass | `expo-image`, `expo-blur`, `expo-glass-effect`, `expo-linear-gradient` | SDK 58 |
| Files, share, print | `expo-file-system`, `expo-sharing`, `expo-print` | SDK 58 |
| Haptics | `expo-haptics` | ~58.0.8 |
| Date picker | `@react-native-community/datetimepicker` (native compact picker) | 9.2.1 |
| Tests | `jest` + `jest-expo` (simulated native modules) + `@testing-library/react-native` | ^30.5 / ~58.0.14 / ^14.1 |
| Dev builds | `expo-dev-client` | ~58.0.20 |
| iOS minimum | 16.4 (the SDK 58 default) | |

Not used, on purpose: no styling library (plain `StyleSheet` + tokens), no
global state library (React Query for server state, React context for the
session, the lock and purchases), no analytics or crash SDK, no push
notifications, no RevenueCat (the backend already exists).

**The app cannot run in Expo Go.** StoreKit, Sign in with Apple and the
Keychain entitlement need a development build (`10-build-release.md`).

## 3. Where things live

The app is a self-contained Expo project in `mobile/`, inside this repository,
with its own `package.json`. It is not an npm workspace.

```
healthtrends/
├─ src/lib/domain/            SHARED: units, status, trend, plausibility, panels
├─ src/…                      the web app (Next.js) — App Store-aware entitlements;
│                             new /privacy, /terms, /support pages
├─ supabase/
│   ├─ migrations/0006_…      copied from docs/ios/reference
│   ├─ functions/…            copied from docs/ios/reference
│   └─ tests/mobile_test.sql  copied from docs/ios/reference
├─ mobile/                    the iOS app
│   ├─ app.config.ts          identifiers, entitlements, privacy manifest, plugins
│   ├─ eas.json               build and submit profiles
│   ├─ metro.config.js        lets Metro read ../src/lib/domain
│   ├─ tsconfig.json          @/* → src/*,  @domain → ../src/lib/domain
│   ├─ jest.config.js         Expo's Jest preset; aliases from tsconfig
│   ├─ __tests__/             lib/ (pure logic), screens/ (every screen, operated), support/ (fixtures, mocks)
│   ├─ assets/art/            the seven paintings (copied from public/art)
│   └─ src/
│       ├─ app/               routes only (expo-router)
│       ├─ components/        ui/ (primitives, form, art, status), charts/, markers/, settings/
│       ├─ lib/               supabase, auth, api, queries, purchases, app-lock,
│       │                     entry (Add results checks), summary (doctor summary), …
│       └─ theme/tokens.ts
└─ docs/ios/                  this guide
```

### Sharing the domain code

`mobile/metro.config.js` adds `../src/lib/domain` to Metro's `watchFolders`,
and `mobile/tsconfig.json` maps `@domain` to `../src/lib/domain/index.ts`. Import
it as:

```ts
import { computeStatus, formatMeasured, PANELS, type Biomarker } from '@domain';
```

Constraints that keep this working, including on Expo's build servers where
only `mobile/` dependencies are installed:

- Files in `src/lib/domain` may import **only each other**, by relative path.
  No `@/…` alias, no npm packages. (That is already true. Keep it true.)
- Nothing else from the web app is imported by the phone app. `analytics.ts`
  and `digest.ts` are small and use the web's `@/` alias, so the phone has its
  own copies in `mobile/src/lib/`; keep them in step when the web ones change.
- The web's `tsconfig.json` excludes `mobile`, `docs` and `supabase/functions`,
  so the web typecheck and build never see React Native or Deno code. (Already
  applied in this repository.)

## 4. Data flow in the app

```
 screen ──► query hook (lib/queries.ts) ──► lib/api.ts ──► supabase-js ──► Postgres
              │                                                 ▲
              └── summarize() + toDigest() from @domain ────────┘ raw rows in
```

- **`lib/api.ts`** is the only file that calls Supabase tables and RPCs. It
  maps database rows to domain types and turns database errors into
  `ApiError` with a stable `code` (`session_limit`, `profile_limit`, …).
- **`lib/queries.ts`** holds the React Query hooks. The important one is
  `useProfileRecord(profile)`: it fetches a profile's results, sessions, life
  events, pinned markers and custom ranges together and runs them through
  `summarize()` once. Screens select from that; **no screen computes status or
  trend itself.**
- Query keys:

  | Key | Contents | Invalidated by |
  | --- | --- | --- |
  | `['profiles']` | the account's profiles | create / edit profile |
  | `['entitlement']` | plan, limits, counts | any write, any purchase outcome |
  | `['catalog']` | built-in + custom markers | custom marker create / archive |
  | `['unit-prefs']` | display unit per marker | unit switch |
  | `['profile', id, 'record']` | everything for one profile | any write to that profile |

- **Writes** use `useRecordMutation(profileId, fn)`, which invalidates that
  profile's record and the entitlement on success. No optimistic updates in
  v1: a health record should show what the server has.

## 5. Offline

- React Query runs in `offlineFirst` mode and its cache is persisted to one
  JSON file (`lib/query-client.ts`), restored at launch, kept for seven days.
- The file is in the app's **Caches** directory: not in iCloud or computer
  backups, and removable by the system. It is covered by the app's
  `NSFileProtectionComplete` entitlement (unreadable while the phone is
  locked) and deleted on sign-out and account deletion.
- **Reading works offline** from that cache. **Writing does not queue**: a
  failed save keeps the form and says so. Queued writes to a medical record
  that silently apply later, possibly twice, are worse than asking the person
  to tap Save again.
- Bump `CACHE_BUSTER` in `query-client.ts` whenever the shape of cached data
  changes.

## 6. Session and navigation

- The Supabase session is stored in the Keychain (`lib/secure-storage.ts`),
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, in chunks.
- `AuthProvider` (`lib/auth.tsx`) holds the session; the root layout keeps the
  splash screen up until the stored session has been read, then renders a
  `Stack` with `Stack.Protected` guards. A second guard in `(app)/_layout.tsx`
  holds an account without a profile on `onboarding`.
- On sign-out the query cache and its file are cleared, so nothing from one
  account can appear under another.
- `PurchasesProvider` is mounted inside `(app)`, so the StoreKit connection
  exists only for a signed-in account, and a new purchase flow is created per
  account.

## 7. Errors

| Layer | Rule |
| --- | --- |
| Database | Triggers raise `P0001` with a machine-readable message (`session_limit`, …). Constraints reject bad input. |
| `lib/api.ts` | Every call goes through `fail()`, which throws `ApiError(code)`. Unknown failures are `request_failed`. |
| Screens | Map `ApiError.code` to the copy in `02-ux.md`. Never show `error.message` to a person. |
| Edge Functions | Log the cause server-side (`console.error`), answer with a short code. Never echo a secret or a stack. |
| Purchases | Outcomes are a fixed set of keys (`NOTICE_COPY` in `lib/purchases.tsx`). |

There is no crash-reporting SDK in v1 (it would be a third party receiving
data from a health app). Use the crash reports in App Store Connect and
Xcode Organizer. If one is added later, it must be configured to send no
user content and be declared in the privacy manifest and labels.

## 8. Environment variables

The app has exactly two, both public:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Locally they are in `mobile/.env.local` (git-ignored). For builds they are
Expo environment variables (`10-build-release.md`). `lib/supabase.ts` throws at
start-up if either is missing, so a misconfigured build fails loudly on first
launch rather than silently talking to nothing.

Every other credential is a server secret and is listed in `05-backend.md` §6.
