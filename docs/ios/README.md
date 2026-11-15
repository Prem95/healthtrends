# bbiom for iOS — build guide

A complete specification for building the bbiom iPhone app with Expo, on the
existing Supabase backend, with App Store subscriptions and Cloudflare DNS.
It is written to be handed to Claude Code and built step by step.

**To build it:** open this repository in Claude Code and say:

> Read `docs/ios/README.md`, then follow `docs/ios/11-build-plan.md` from
> step 1. Stop at every step marked HUMAN and tell me exactly what you need.

## What is in this folder

| File | What it answers |
| --- | --- |
| `01-product.md` | Why anyone needs this on a phone, who for, what v1 is and is not |
| `02-ux.md` | Every screen: purpose, content, states, copy, gestures, accessibility |
| `03-design-system.md` | Tokens, type, components, charts, artwork, glass, motion, haptics |
| `04-architecture.md` | Stack, pinned versions, folder layout, data flow, offline, errors |
| `05-backend.md` | The migration, RPCs, Edge Functions, auth settings, web changes |
| `06-auth.md` | Sign in with Apple, email code, Google; session storage |
| `07-payments.md` | App Store Connect setup, purchase flow, server verification, testing |
| `08-security.md` | Threat model, every control, the pre-release checklist |
| `09-cloudflare-dns.md` | Every DNS record, custom API domain, email authentication |
| `10-build-release.md` | App config, builds, TestFlight, App Review, privacy labels |
| `11-build-plan.md` | **The ordered steps to execute**, each with a check that must pass |
| `12-qa.md` | Automated checks, the sandbox purchase matrix, the manual test script |
| `reference/` | Working code. Copy it; do not retype it from the prose |

## The reference code is the source of truth

`reference/` holds real files that were compiled and tested (see below). The
guides explain them; where prose and a reference file disagree, the file wins.

```
reference/
  supabase/migrations/0006_mobile_and_app_store.sql   database changes
  supabase/tests/mobile_test.sql                      assertions for the above
  supabase/tests/run-without-docker.mjs               runs both SQL test files on PGlite
  supabase/functions/_shared/apple.ts                 App Store Server API + Sign in with Apple
  supabase/functions/iap-confirm/                     confirms a purchase
  supabase/functions/app-store-notifications/         Apple's webhook
  supabase/functions/delete-account/                  in-app account deletion
  supabase/functions/_tests/functions_test.ts         tests for the three functions
  supabase/functions/config.additions.toml            lines to add to supabase/config.toml
  supabase/functions/deno.json                        lets Deno run beside the web package.json
  web/entitlements.ts                                 replaces src/lib/entitlements.ts
  mobile/                                             the Expo app foundation (becomes /mobile)
```

`reference/mobile` is the app's foundation, not the whole app. Built and
working: configuration, secure session storage, the Supabase client, all three
sign-in methods, every data read and write, the purchase flow, app lock, export,
the in-app privacy / terms / support links,
the design tokens and components, the chart, and these screens: sign-in, code
entry, first profile, Overview, marker detail, paywall, settings.

Still to be built from `02-ux.md`, each with a web implementation in this
repository to port from: the **Markers** list, the **Timeline**, **Add
results** (these three exist as route stubs), the **Doctor summary**, and three
additions to existing screens — profiles and custom markers in Settings, and
"set your own range" plus deleting a result in marker detail. The plan has a
step for each.

## What was verified, and what was not

Everything below was run while writing this guide, against the versions pinned
in `04-architecture.md` (Expo SDK 58, React Native 0.88, expo-iap 6.4,
supabase-js 2.119).

| Checked | How | Result |
| --- | --- | --- |
| Migration 0006 applies after 0001–0005, and applies twice | Postgres (PGlite) with Supabase's roles | pass |
| Plan limits, entitlement rules, atomic save, RLS, constraints | `mobile_test.sql`, 50+ assertions | pass |
| The existing `supabase/tests/rls_test.sql` still passes | same database | pass |
| Three Edge Functions typecheck | `deno check` (Deno 2.9) | pass |
| Edge Functions behave correctly | 17 Deno tests, with Apple / Stripe / Supabase faked | pass |
| Mobile app typechecks | `tsc --noEmit` | pass |
| Mobile app lints | `expo lint` | pass |
| Mobile app bundles for iOS, including the code shared with the web | `expo export --platform ios` | pass |
| Native iOS project generates with the right entitlements, Info.plist and privacy manifest | `expo prebuild --platform ios` | pass |
| `expo-doctor` | 18 of 20 checks | pass; the other 2 need network access that was blocked where this was written — re-run it |
| Web app still typechecks with the App Store-aware `getPlan` | `tsc --noEmit` | pass |
| The test commands in `11-build-plan.md` A4–A5 work with the files at their final paths in `supabase/` | copied in, ran, removed again | pass |
| App installs reproducibly | `reference/mobile/package-lock.json` is the lockfile of the verified install; `npm ci` | — |

**Not verified, because it cannot be without your Apple account and a Mac or
Expo build:** the compiled native app running on a device, a real StoreKit
purchase, Apple's real server responses and notifications, Sign in with Apple
against Apple's servers, and App Review. `12-qa.md` is the script for exactly
those. Treat the first sandbox purchase as the real test of `07-payments.md`.

One more honest limit: the App Store Server API details in
`reference/supabase/functions/_shared/apple.ts` (endpoint paths, token claims,
status codes) are written from Apple's documented contract and exercised only
against a fake. They are the first place to look if a sandbox purchase is not
confirmed.

## Before you start: things only you can provide

Claude Code cannot create these. Have them ready; the plan asks for each at the
step that needs it.

1. **Apple Developer Program membership** (paid) and access to App Store Connect.
2. **An Expo account** (free tier is enough to start).
3. **The Supabase project** this repo deploys to, with CLI access (`supabase login`).
4. **A domain in Cloudflare** for the website, the privacy policy and email.
5. **Decisions**, with the defaults this guide assumes:

| Decision | Default used throughout | Change it in |
| --- | --- | --- |
| Bundle identifier | `com.bbiom.app` | `mobile/app.config.ts`, function secret `APP_BUNDLE_ID` |
| URL scheme | `bbiom` | `mobile/app.config.ts` |
| Monthly product id | `com.bbiom.app.pro.monthly` | `mobile/src/lib/purchases.tsx`, secret `IAP_PRODUCT_IDS` |
| Yearly product id | `com.bbiom.app.pro.yearly` | same |
| Domain | written as `YOUR_DOMAIN` | search and replace |

If you change the bundle identifier, change it everywhere in one pass: it must
be identical in App Store Connect, `app.config.ts`, the Supabase Apple provider
"Client IDs" list, and the `APP_BUNDLE_ID` secret.

## Rules for the agent building this

- Follow `11-build-plan.md` in order. Each step ends with a check; do not start
  the next step until it passes.
- Copy files from `reference/` rather than rewriting them.
- Expo changes between SDK releases. Before using an Expo API that is not
  already used in `reference/mobile`, read the installed package's types in
  `mobile/node_modules`, or the versioned docs at
  `https://docs.expo.dev/versions/v58.0.0/`. `mobile/AGENTS.md` repeats this.
- Install Expo packages with `npx expo install`, never `npm install`, so
  versions match the SDK.
- Never put a secret in the app or in git. The app holds only the Supabase URL
  and publishable key. Everything else is a Supabase function secret or an
  Expo/App Store credential (`08-security.md`).
- Never weaken a check to make it pass. If a step cannot pass, stop and report.
