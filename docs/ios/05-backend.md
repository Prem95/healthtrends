# 05 — Backend: Supabase changes

The phone app reuses the existing project: same tables, same row-level
security, same accounts. This file covers what has to change so that a client
which talks to the database directly is safe, and so that App Store
subscriptions and the website's Stripe subscriptions add up to one entitlement.

All files referred to are in `docs/ios/reference/` and are copied into place by
`11-build-plan.md`.

## 1. Why the database changes at all

Before this, three rules existed only in the Next.js server actions:

- plan limits (1 profile and 20 tests on Free),
- "a test and its results are saved together",
- input size limits (zod schemas).

A phone app does not go through the web server. Anyone with the publishable
key and their own JWT — which is every user — can call PostgREST directly. So
those rules move into Postgres, where they hold for the website, the app, and
anyone using `curl`. This also closes a gap that already existed on the web.

## 2. Migration `0006_mobile_and_app_store.sql`

Idempotent; safe to run twice. What it does, in order:

1. **Explicit grants.** `select / insert / update / delete` on the health
   tables to `authenticated`; `select` only on `subscriptions`; everything
   revoked from `anon`. (Newer Supabase projects no longer grant these by
   default, and a missing grant fails with `42501`.)
2. **App Store columns on `subscriptions`**, next to the Stripe ones:
   `app_store_original_transaction_id` (unique when set),
   `app_store_product_id`, `app_store_status`
   (`active | grace | billing_retry | expired | revoked`),
   `app_store_expires_at`, `app_store_auto_renew`, `app_store_environment`,
   `app_store_updated_at`. Stripe keeps writing `plan / status /
   current_period_end`; Apple state goes only in the new columns, so neither
   can overwrite the other.
3. **`app_store_notifications`** — an audit table of received notifications,
   readable by the service role only.
4. **`apply_app_store_subscription(...)`** — the single writer of App Store
   state. Executable by `service_role` only. It refuses to attach a
   subscription to a second account, resolves a notification to its account by
   transaction id or by the app account token, and will not let news about an
   old dead subscription overwrite a live one. Returns
   `{ result: 'applied' | 'conflict' | 'ignored' | 'unknown_user', user_id }`.
5. **`user_is_pro(user_id)`** — the one definition of "is Pro":
   Stripe (`plan = 'pro'` and active / trialing / past_due, or inside a paid
   period) **or** App Store (`active` or `grace`, not lapsed by more than a
   day). Not callable by clients.
6. **`my_entitlement()`** — what the signed-in user may do, as JSON: `plan`,
   `source` (`app_store` | `stripe` | null), expiry, auto-renew, `maxProfiles`,
   `maxSessions` (null = unlimited), `profileCount`, `sessionCount`. The app
   reads this; it cannot write anything that feeds it.
7. **Plan-limit triggers** on `profiles` and `test_sessions` (`before
   insert`). Over the limit they raise SQLSTATE `P0001` with the message
   `profile_limit` or `session_limit`. A per-user advisory lock stops two
   simultaneous inserts both passing.
8. **`create_session_with_results(...)`** — saves a test and all its results
   in one transaction. `security invoker`: each insert is still checked by
   row-level security as the caller. Rejects more than 200 results and a date
   more than a day in the future.
9. **Input constraints** (`not valid`, so existing rows are not re-checked):
   name and label lengths, note lengths, a sane date, and no `NaN` / infinite
   values.

After a downgrade, nothing is deleted or hidden: existing profiles and tests
stay readable; only *new* rows over the limit are refused.

### Result payload for `create_session_with_results`

```jsonc
[
  {
    "biomarker_id": "ldl-cholesterol",
    "value": 94,                 // ALWAYS the canonical unit
    "entered_unit": "mg/dL",     // what the person typed it in
    "lab_range": { "max": 100 }, // canonical unit, or null
    "flag_on_report": null,
    "note": null
  }
]
```

The client converts to canonical units with the shared `@domain` functions
before calling. `api.createSession()` in the app does the mapping.

## 3. Tests for the migration

`supabase/tests/mobile_test.sql` (about 60 assertions, one rolled-back
transaction). It proves: both limits, the atomic save and its rollback, that
another user cannot save into your profile, that clients cannot write
subscription state or call the internal functions, every entitlement case
(App Store active / grace / billing retry / lapsed, Stripe active / cancelled
but paid / expired), the one-account-per-subscription rule, and the input
constraints.

```sh
supabase start
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/mobile_test.sql
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
  -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
```

Both must end without an error. The last line of the first is
`mobile_test.sql: all assertions passed`.

**Without Docker** (a cloud session, CI): `supabase/tests/run-without-docker.mjs`
applies every migration to PGlite (Postgres in WebAssembly) with a stand-in
for Supabase's `auth` schema, applies 0006 twice, and runs both test files:

```sh
mkdir -p /tmp/dbtest && npm --prefix /tmp/dbtest install @electric-sql/pglite@0.5
cp supabase/tests/run-without-docker.mjs /tmp/dbtest/
node /tmp/dbtest/run-without-docker.mjs "$PWD"
```

It ends with `mobile_test.sql: all assertions passed` and
`rls_test.sql: passed`. This is how the migration was verified while writing
this guide; run the psql version against a real Supabase stack before
release.

## 4. Edge Functions

Three functions, Deno, each a single `index.ts` using
`withSupabase` from `npm:@supabase/server@1` for authentication and client
creation, plus one shared module.

| Function | Called by | Auth | Purpose |
| --- | --- | --- | --- |
| `iap-confirm` | the app, after a purchase or restore | `user` (JWT) | Ask Apple what the transaction is; record it; return the verdict |
| `app-store-notifications` | Apple | none (`verify_jwt = false`) | Re-read the subscription from Apple when it changes; record it |
| `delete-account` | the app | `user` (JWT) | Cancel Stripe, revoke Sign in with Apple, delete all data and the user |

### The trust rule (`_shared/apple.ts`)

Nothing sent by a client or a webhook is believed. A signed transaction from
the app, or a notification body from "Apple", is decoded **only to read a
transaction id**. The facts — product, expiry, status, the account it was
bought for — are then fetched from the **App Store Server API** over TLS,
authenticated with our own key. A forged or replayed input can therefore do
exactly one thing: cause a re-read of a real subscription. This is why the
functions do not need to validate Apple's certificate chain, and why the
unauthenticated webhook is safe.

### `iap-confirm`

Request (what `toPurchaseConfirmationRequest()` in expo-iap produces):

```json
{ "store": "apple", "purchaseToken": "<StoreKit JWS>", "productId": "com.bbiom.app.pro.yearly" }
```

Response — always HTTP 200 with one of these, which is exactly expo-iap's
`PurchaseConfirmation` type:

| Body | Meaning | App then |
| --- | --- | --- |
| `{ "status": "entitled", "alreadyGranted": false }` | Real, active, recorded for this account | finishes the transaction |
| `{ "status": "ownership_conflict", "alreadyGranted": true }` | Real, but belongs to another bbiom account | finishes it; tells the person |
| `{ "status": "invalid", "reason": "…" }` | Wrong app, unknown product, expired, revoked, not found | finishes it (iOS would redeliver forever) |
| `{ "status": "verification_delayed", "retryAfterMs": 30000 }` | Apple or the database was unreachable | **does not finish**; retries later |

The last row is the important one: **trouble on our side never rejects a
purchase.** The transaction stays unfinished in StoreKit and is redelivered
until we can confirm it.

Checks, in order: caller is signed in → transaction exists at Apple (production
first, then sandbox) → bundle id is ours → product is one of ours and the one
the app expected → current subscription state from Apple → the transaction's
`appAccountToken` is the caller (enforced in SQL) → write → verdict.

Sandbox transactions are accepted by the production backend on purpose:
TestFlight builds and App Review both purchase in the sandbox.

### `app-store-notifications`

Apple posts `{ "signedPayload": "…" }` when a subscription renews, fails to
renew, expires, is refunded or revoked, or changes plan. The function reads the
transaction id, fetches the state from Apple, and calls
`apply_app_store_subscription` with no caller. It answers:

- `200` for anything handled, and for anything that is not ours or has no
  transaction (Apple's TEST notification) — so Apple stops retrying;
- `400` for a body that is not a notification;
- `503` when Apple's API or the database could not be reached — so Apple
  **retries** later.

### `delete-account`

Body `{ "confirm": "DELETE", "appleAuthorizationCode"?: string }`. Cancels a
Stripe subscription if there is one, revokes the Sign in with Apple grant if
the app supplied a fresh authorization code (best effort — deletion never
depends on it), deletes the user's rows, then the auth user. Responds
`{ ok, appleRevoked, appStoreSubscriptionActive }`; the last field tells the
app to send the person to Apple's subscription settings, because only they can
cancel an App Store subscription.

### Tests for the functions

`supabase/functions/_tests/functions_test.ts` — 17 tests with Apple, Stripe and
Supabase replaced by an in-process fake. They check authentication, the App
Store Server API token we mint (issuer, audience, key id, bundle id, lifetime),
the production → sandbox fallback, every verdict, the exact arguments written
to the database, the retry behaviour of the webhook, and the order of
operations in account deletion.

```sh
cd supabase/functions
deno check iap-confirm/index.ts app-store-notifications/index.ts delete-account/index.ts
deno test --allow-env --allow-net _tests/functions_test.ts      # 17 passed
```

Run them from `supabase/functions`. The `deno.json` there
(`"nodeModulesDir": "none"`) stops Deno from treating the web app's root
`package.json` as the source of npm packages; without it, Deno fails with
"Could not find a matching package for 'npm:jose@6' in the node_modules
directory".

## 5. `supabase/config.toml`

Append the contents of `functions/config.additions.toml`:

```toml
[functions.app-store-notifications]
verify_jwt = false
```

The other two keep the default (`verify_jwt = true`) and are additionally
checked by `withSupabase({ auth: 'user' })`.

## 6. Function secrets

Set with `supabase secrets set NAME=value` (or the dashboard: Edge Functions ›
Secrets). Names starting `SUPABASE_` are provided by the platform; do not set
them.

| Secret | Value | Used by |
| --- | --- | --- |
| `APP_BUNDLE_ID` | `com.bbiom.app` | all three |
| `IAP_PRODUCT_IDS` | `com.bbiom.app.pro.monthly,com.bbiom.app.pro.yearly` | iap-confirm, notifications |
| `APPLE_IAP_ISSUER_ID` | Issuer ID from App Store Connect › Users and Access › Integrations › In-App Purchase | iap-confirm, notifications |
| `APPLE_IAP_KEY_ID` | Key ID of the In-App Purchase key | same |
| `APPLE_IAP_PRIVATE_KEY` | Full contents of the `.p8`, including the BEGIN / END lines | same |
| `APPLE_TEAM_ID` | Your 10-character Apple Team ID | delete-account |
| `APPLE_SIWA_KEY_ID` | Key ID of a key with "Sign in with Apple" enabled | delete-account |
| `APPLE_SIWA_PRIVATE_KEY` | Full contents of that `.p8` | delete-account |
| `STRIPE_SECRET_KEY` | The same key the website uses | delete-account |

Setting a multi-line key from a file:

```sh
supabase secrets set APPLE_IAP_PRIVATE_KEY="$(cat AuthKey_XXXXXXXXXX.p8)"
```

The `.p8` files are downloadable once. Store them in a password manager, never
in the repository (`mobile/.gitignore` and the root `.gitignore` ignore `*.p8`).

If the three `APPLE_SIWA_*` / `APPLE_TEAM_ID` secrets are missing, account
deletion still works and simply skips the Apple revocation. Set them before
submitting to App Review.

## 7. Auth settings (dashboard)

Authentication › Sign In / Providers:

- **Email**: enabled. Email OTP expiry 3600 s (default). Keep "Confirm email"
  on.
- **Apple**: enabled. In **Client IDs** add the bundle identifier
  (`com.bbiom.app`), plus any development variants you create. No OAuth secret
  is needed for the native flow.
- **Google**: already configured for the website. Nothing to add.

Authentication › URL Configuration › **Redirect URLs**: add

```
bbiom://auth/callback
```

Authentication › Email Templates › **Magic Link**: the phone signs in with a
six-digit code, the website with a link, and both use this one template. It
must contain **both** `{{ .ConfirmationURL }}` (the button the website needs)
and `{{ .Token }}` (the code the app needs). Add this block to
`supabase/templates/magic_link.html` above the button, then paste the file into
the dashboard template:

```html
<p style="margin:24px 0 8px 0; font-size:14px; line-height:1.6; color:#40504b;">
  Signing in on the bbiom app? Enter this code:
</p>
<p style="margin:0 0 24px 0; font-size:32px; font-weight:600; letter-spacing:6px; color:#13231f; font-variant-numeric:tabular-nums;">
  {{ .Token }}
</p>
```

Rate limits (Authentication › Rate Limits): leave the defaults. Email sending
on the built-in service is capped at a few per hour; **configure custom SMTP
before launch** (`09-cloudflare-dns.md` §2).

## 8. Changes to the web app

Two small changes so the website understands a subscription bought in the app.

1. **Replace `src/lib/entitlements.ts`** with
   `docs/ios/reference/web/entitlements.ts`. `getPlan()` now also returns Pro
   for an active App Store subscription, and returns `source`
   (`'stripe' | 'app_store' | null`). It is the TypeScript twin of
   `user_is_pro()`.
2. **Do not sell Pro twice.** In `src/app/app/settings/billing-actions.ts`, at
   the top of `startCheckout` after the user check:

   ```ts
   const current = await getPlan(user.id);
   if (current.source === "app_store") redirect("/app/settings?error=managed_in_app");
   ```

   Add to `ERROR_TEXT` in `src/app/app/settings/page.tsx`:

   ```ts
   managed_in_app:
     "Your Pro subscription was bought in the iPhone app. Manage it in your App Store subscriptions.",
   ```

   and in the Plan card, when `plan.plan === "pro"` and
   `plan.source === "app_store"`, show that sentence instead of the "Manage
   billing" button.

The app does the mirror image: an account that is Pro through Stripe sees "You
are on Pro through the bbiom website" on the paywall and no purchase buttons.

## 9. Deploying

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push                               # applies 0006
supabase secrets set …                         # §6
supabase functions deploy iap-confirm
supabase functions deploy app-store-notifications
supabase functions deploy delete-account
```

Check after deploying:

```sh
# 401: the function is up and refuses a caller without a session
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/iap-confirm

# 400: the webhook is public and rejects a body that is not a notification
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "content-type: application/json" -d '{}' \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/app-store-notifications
```
