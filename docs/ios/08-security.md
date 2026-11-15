# 08 — Security

What the app protects, from whom, and the control that does it. Every control
here exists in `reference/` or is a setting named in a guide; nothing is
aspirational. The checklist at the end is run before every App Store
submission.

## 1. What is being protected

| Asset | Why it matters | Where it lives |
| --- | --- | --- |
| Lab results, life events, notes | Health data: special-category in the GDPR, deeply personal everywhere | Postgres (Supabase); a cached copy on the phone |
| The session | Whoever holds it reads everything above | iOS Keychain |
| The subscription state | Money: Pro must not be obtainable for free, and a payer must not lose it | `subscriptions` table, written only by the server |
| Server credentials (Apple keys, Stripe key, service role) | Each one is total control of something | Supabase function secrets only |

## 2. Who might try

| Adversary | Realistic attempt | Stopped by |
| --- | --- | --- |
| **Another bbiom user** | Change an id in a request to read or write someone else's rows | §3 — RLS and grants in Postgres |
| **The account owner, being clever** | Call PostgREST directly to skip the Free limits or grant themselves Pro | §3 — limits in triggers, subscription writes only by service role |
| **Someone holding the unlocked phone** (partner, child, a lost phone found unlocked) | Open the app and read | §5 — Face ID lock, privacy cover |
| **Someone with the phone's backup or a forensic image** | Read the cache or session from disk | §5 — Keychain `THIS_DEVICE_ONLY`, cache in Caches with complete file protection |
| **A forged purchase** | Send a fabricated or replayed transaction to `iap-confirm`, or a fake notification to the webhook | §4 — the server asks Apple; nothing in the request is believed |
| **A network attacker** | Read or alter traffic | TLS everywhere (iOS App Transport Security is left at its default: HTTPS only, no exceptions) |
| **A third-party SDK** | Collect data the person never agreed to share | §6 — there are none |
| **A leaked repository** | Find a key | §7 — no secret is in the app or git |

Out of scope, stated so nobody assumes otherwise: a compromised Supabase or
Apple account of the developer, a jailbroken device with malware running as
the user, and a person who knows the phone's passcode (Face ID falls back to
it, by design).

## 3. The database is the security boundary

The app talks to Supabase's REST API directly with the person's session. The
publishable key in the app is public and is not a secret. That is safe only
because **every rule lives in Postgres** — anything enforced only in app code
can be skipped with `curl`.

- **Row-level security** on every table (`0002_rls.sql`): each row belongs to
  a `user_id`; `profiles`, `test_sessions`, `test_results`, `life_events` are
  reachable only through a profile the caller owns. `mobile_test.sql` proves
  a second user can neither read nor write them, including through the RPC.
- **Explicit grants** (0006 §1): Supabase is moving to "no table is exposed
  unless granted". The migration grants exactly what `authenticated` needs and
  revokes everything from `anon`, so the app is correct both before and after
  that change.
- **Plan limits as triggers** (0006 §5): one profile and 20 tests on Free,
  six profiles on Pro. A transaction-level advisory lock per user stops two
  parallel inserts from both slipping under the limit.
- **Atomic save** (`create_session_with_results`): a test and its results are
  saved together or not at all, and the function runs as the caller
  (`security invoker`), so RLS still applies inside it.
- **Constraints** (0006 §7): length limits on every text field, finite and
  sane numbers, no future dates. They are `NOT VALID` so existing rows are not
  rechecked; every new write is.
- **Subscription state is not writable by clients.** `authenticated` has
  `select` only on `subscriptions`; `apply_app_store_subscription` and
  `user_is_pro` can be executed only by `service_role`. A client learns its
  plan from `my_entitlement()`, which reads but never writes.
- **Errors do not leak.** The RPC and triggers raise stable codes
  (`profile_limit`, `session_limit`, `invalid_results`, …) that the app maps
  to sentences; raw database messages are never shown.

## 4. Payments: the server decides, and asks Apple

- `iap-confirm` requires a valid session (`withSupabase({ auth: 'user' })` on
  top of the platform's `verify_jwt`). The user id comes from the verified
  token, never from the body.
- The purchase token (a JWS from StoreKit) and the webhook's `signedPayload`
  are only **decoded** to read a transaction id and bundle id. The function
  then calls the **App Store Server API** with its own ES256-signed token and
  uses Apple's answer. A forged or altered JWS therefore achieves nothing:
  Apple either does not know the id, or reports the real state of it.
- Bundle id and product id are checked against `APP_BUNDLE_ID` and
  `IAP_PRODUCT_IDS`; anything else is `invalid`.
- `appAccountToken` = the buyer's user id. `apply_app_store_subscription`
  refuses to move a subscription that already belongs to another account
  (`ownership_conflict`), so a shared Apple ID cannot give two accounts Pro.
- The webhook is public by necessity (`verify_jwt = false`). It does not
  trust its body (above), records every notification in a ledger that clients
  cannot read, and answers 503 on failure so Apple retries.
- The money path is idempotent: the same transaction confirmed twice, or a
  notification delivered twice, produces the same row.

## 5. On the device

| Control | Implementation | Why |
| --- | --- | --- |
| Session in the Keychain | `lib/secure-storage.ts`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, chunked | Encrypted by the Secure Enclave-backed keychain; not in backups; not synced; unreadable while locked |
| PKCE for Google | `flowType: 'pkce'` | An intercepted redirect code is useless without the verifier |
| System browser for OAuth | `WebBrowser.openAuthSessionAsync` | The app never sees the Google password |
| Face ID / passcode lock | `lib/app-lock.tsx`, a switch in Settings (off by default); relocks after 60 s in the background | The phone is often unlocked in someone else's hand |
| Privacy cover | Same provider: an opaque cover the moment the app goes inactive | The app-switcher snapshot would otherwise show results |
| Offline cache | React Query persisted to a file in `Paths.cache` | Caches are excluded from iCloud and iTunes backups |
| File protection | Entitlement `com.apple.developer.default-data-protection = NSFileProtectionComplete` | Every file the app writes is encrypted and unreadable while the phone is locked |
| Sign out clears the cache | `onAuthStateChange('SIGNED_OUT')` → `queryClient.clear()` + delete the cache file | The next account on the phone sees nothing of the last |
| Exports are temporary | Written to Caches, handed to the share sheet | The person chooses where a copy goes |
| No logging of data | The app has no `console.*` calls; the Edge Functions log only error messages, never request bodies, tokens or emails | Device and function logs are read by more people and tools than the database is |

The cache can be dropped from the threat model entirely (memory-only) by
removing the persister; the cost is losing "recall with no signal", which is
one of the three jobs. The trade is deliberate: the cache is protected as
strongly as iOS allows, and the person can turn on the lock.

## 6. No third parties in the app

The app contains no analytics, crash-reporting, advertising, attribution or
"growth" SDK. Its only network peers are Supabase (the project's own API and
functions), Apple (StoreKit, Sign in with Apple — both system frameworks) and
Google's sign-in page in the system browser.

This is what lets the App Privacy label say "not used for tracking" truthfully
and makes the privacy manifest short. If crash reporting is added later, it
must be self-hosted or configured to send no user data, and the privacy label
and manifest must be updated in the same change.

## 7. Secrets

| Secret | Lives in | Never in |
| --- | --- | --- |
| Supabase secret / service-role key | Supabase platform (injected into functions) | The app, git, Expo env vars |
| App Store In-App Purchase key (`.p8`) | Supabase function secret `APPLE_IAP_PRIVATE_KEY`; a password manager | git, the app |
| Sign in with Apple key (`.p8`) | Supabase function secret `APPLE_SIWA_PRIVATE_KEY`; a password manager | git, the app |
| Stripe secret key | Vercel env for the website; Supabase function secret for deletion | git, the app |
| App signing certificate, provisioning profile | Expo credentials service (or your keychain) | git |
| App Store Connect API key for `eas submit` | Expo credentials service | git |

What *is* in the app: the Supabase URL and the **publishable** key, both public
by design (`04-architecture.md` §8). `*.p8` and `.env*` are git-ignored at the
root and in `mobile/` (`.env.example` excepted).

If a key leaks: revoke it where it was created (App Store Connect › Users and
Access › Integrations; Apple Developer › Keys; Stripe dashboard; Supabase ›
API keys), create a new one, `supabase secrets set` it, redeploy the
functions. No app update is needed for any of them.

## 8. Account deletion and data rights

- In-app deletion (`delete-account`) removes profiles (and through them every
  test, result and life event), custom markers, unit preferences, the
  subscription row and the auth user, and revokes Sign in with Apple. It
  cancels a Stripe subscription. It cannot cancel an App Store subscription —
  only the person can — so the app says so when one is active.
- Export (CSV / JSON) is free and complete.
- Notification ledger rows are not linked to a user id once the account is
  gone (they hold Apple's transaction ids only) and can be purged on a
  schedule.

## 9. Encryption export compliance

The app uses only encryption built into iOS (HTTPS, Keychain, file
protection). `ios.config.usesNonExemptEncryption: false` writes
`ITSAppUsesNonExemptEncryption = NO` into Info.plist, so App Store Connect
does not ask the export question for each build. If the app ever ships its own
cryptography, revisit this.

## 10. Pre-release security checklist

Run before every submission. Each line is a yes/no.

**Backend**
- [ ] `mobile_test.sql` and `rls_test.sql` pass against the production schema (`supabase db diff` shows nothing unexpected)
- [ ] `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;` returns no rows
- [ ] `anon` has no table privileges in `public` (`\dp public.*`)
- [ ] `iap-confirm` without a session answers 401; the webhook with `{}` answers 400
- [ ] Function secrets list (`supabase secrets list`) has every name in `05-backend.md` §6 and nothing unexpected
- [ ] Supabase Auth: email confirmations on, custom SMTP on, redirect allow-list holds only the website and `bbiom://auth/callback`

**App**
- [ ] `grep -rn "console.log" mobile/src` returns nothing that prints data
- [ ] `grep -rniE "service_role|sk_live|sk_test|BEGIN PRIVATE KEY" mobile` returns nothing
- [ ] The only `EXPO_PUBLIC_` variables are the Supabase URL and publishable key
- [ ] `ios/` generated by prebuild contains the data-protection entitlement and no `NSAllowsArbitraryLoads`
- [ ] With the lock on: background for 61 s → reopen → Face ID asked; app switcher shows the cover
- [ ] Sign out → sign in as another account → no trace of the first
- [ ] Delete account → sign in again with the same method → an empty, new account

**Payments**
- [ ] A sandbox purchase on account A, then Restore on account B → "belongs to a different bbiom account", B stays Free
- [ ] A hand-edited purchase token sent with `curl` to `iap-confirm` → `invalid`, nothing written
