# 11 — Build plan

The ordered steps to take this repository from "website" to "website + iPhone
app in the App Store". Execute them in order. Every step ends with **Check**:
commands or observations that must pass before the next step starts.

Steps marked **HUMAN** need something only the owner can do (an account, a
payment, a key, a phone). When you reach one, stop, tell the owner exactly
what is needed (quote the step), and wait. Do not invent values for them.

Conventions:

- Paths are relative to the repository root unless a `cd` says otherwise.
- `YOUR_PROJECT_REF`, `YOUR_DOMAIN` are placeholders; ask for the real values
  at the step that needs them.
- If a check fails: fix the cause, never the check. If it cannot be fixed,
  stop and report what you ran and what it printed.
- Commit after each part (A, B, C) with a message that says what was done.

---

## Part A — Backend and website (no accounts needed)

### A1. Orient

Read `docs/ios/README.md`, `docs/ios/04-architecture.md`, and
`docs/ios/reference/mobile/AGENTS.md`. Note the root `AGENTS.md`: the web app
is Next.js 16 — read `node_modules/next/dist/docs/` before changing web code.

**Check:** `git status` is clean; `node -v` is 22 or newer.

### A2. Root configuration is ready

These are already in the repository; confirm them:

- `tsconfig.json` `exclude` contains `"docs"`, `"mobile"`, `"supabase/functions"`
  (keeps React Native and Deno code out of the web typecheck).
- `.gitignore` contains `*.p8` and `!.env.example`.

**Check:** `npx tsc --noEmit`, `npm run lint` and `npx vitest run` pass at the root.

### A3. Copy the backend files

```sh
cp docs/ios/reference/supabase/migrations/0006_mobile_and_app_store.sql supabase/migrations/
cp docs/ios/reference/supabase/tests/mobile_test.sql docs/ios/reference/supabase/tests/run-without-docker.mjs supabase/tests/
mkdir -p supabase/functions
cp -R docs/ios/reference/supabase/functions/_shared docs/ios/reference/supabase/functions/_tests \
      docs/ios/reference/supabase/functions/iap-confirm docs/ios/reference/supabase/functions/app-store-notifications \
      docs/ios/reference/supabase/functions/delete-account docs/ios/reference/supabase/functions/deno.json \
      supabase/functions/
grep -q "functions.app-store-notifications" supabase/config.toml || \
  { echo; cat docs/ios/reference/supabase/functions/config.additions.toml; } >> supabase/config.toml
```

**Check:** `ls supabase/functions` shows `_shared _tests app-store-notifications
delete-account deno.json iap-confirm`; `supabase/config.toml` contains
`[functions.app-store-notifications]` exactly once.

### A4. Database tests

With Docker and the Supabase CLI available, use the psql commands in
`05-backend.md` §3. Otherwise:

```sh
mkdir -p /tmp/dbtest && npm --prefix /tmp/dbtest install @electric-sql/pglite@0.5
cp supabase/tests/run-without-docker.mjs /tmp/dbtest/
node /tmp/dbtest/run-without-docker.mjs "$PWD"
```

**Check:** output ends with `mobile_test.sql: all assertions passed` and
`rls_test.sql: passed`.

### A5. Edge Function tests

Install Deno 2 if `deno --version` fails (`npm install -g deno`, or the
installer from deno.com).

```sh
cd supabase/functions
deno check iap-confirm/index.ts app-store-notifications/index.ts delete-account/index.ts
deno test --allow-env --allow-net _tests/functions_test.ts
cd ../..
```

**Check:** three `Check` lines, then `17 passed | 0 failed`. Do not commit
`supabase/functions/deno.lock` unless the team already commits lockfiles.

### A6. Website understands App Store subscriptions

Apply `05-backend.md` §8:

1. `cp docs/ios/reference/web/entitlements.ts src/lib/entitlements.ts`
2. The `startCheckout` guard in `src/app/app/settings/billing-actions.ts`.
3. The `managed_in_app` text in `ERROR_TEXT` and the Plan card branch in
   `src/app/app/settings/page.tsx`.

> **Deploy order matters.** The new `getPlan()` reads the `app_store_*`
> columns. The website must not be deployed with this change until migration
> 0006 is applied to the production database (C2). Keep it on this branch
> until then.

**Check:** `npx tsc --noEmit`, `npm run lint`, `npx vitest run` pass.

### A7. Privacy, terms and support pages

Create `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`,
`src/app/support/page.tsx` with the content listed in `10-build-release.md` §6,
styled with the site's existing components (`CLAUDE.md` Design Context), and
add the three links to the landing page footer. They are public pages: confirm
`src/proxy.ts` does not require a session for them.

**Check:** `npm run build` passes; with `npm run dev`, each of `/privacy`,
`/terms`, `/support` returns 200 signed out. Tell the owner the privacy policy
text needs their review (and ideally a lawyer's) before launch.

Commit Part A.

---

## Part B — The app (no accounts needed)

### B1. Create `mobile/`

```sh
cp -R docs/ios/reference/mobile mobile
mkdir -p mobile/assets/art && cp public/art/*.webp mobile/assets/art/
```

**Check:** `ls mobile/assets/art` lists `cta deep hero step1 step2 step3 wide`
(`.webp`); `mobile/package-lock.json` exists.

### B2. Install

```sh
cd mobile
npm ci
npx expo install --check
npx expo-doctor
```

`npm ci` installs the exact versions this guide was verified with. If
`expo install --check` proposes patch updates, accept them. If either command
cannot reach Expo's servers (a restricted network), run with `EXPO_OFFLINE=1`
and note that `expo-doctor`'s network checks were skipped.

**Check:** `npx expo-doctor` reports no problems (or only network-only checks
when offline).

### B3. Local environment

```sh
cp .env.example .env.local
```

Placeholder values are enough for Part B. Real values come in C1.

**Check:**

```sh
npm run typecheck
npm run lint
npm test
npm run bundle:check && rm -rf dist
```

All four pass; the bundle step prints an `.hbc` file of about 4 MB.

### B4. Unit tests and completeness gate

Every screen in `02-ux.md` is already in `mobile/` — there is nothing to write
in this part, only to confirm. From `mobile/`:

```sh
npm test                                     # 53 passed, 9 suites: every screen operated, plus the pure logic
grep -rn "ROUTE STUB\|not built yet" src     # nothing
grep -rn "console\.\(log\|warn\|info\)" src  # nothing
```

**Check:** all three as shown. If you change a screen later, keep its
behaviour in line with its `02-ux.md` section and re-run B3 and B4.

Commit Part B. The app is complete in code; everything left needs accounts.

---

## Part C — Accounts, deployment, device, release

### C1. HUMAN — Supabase access

Ask the owner for: the project ref, `supabase login` on this machine (or an
access token in `SUPABASE_ACCESS_TOKEN`), the project URL and **publishable**
key. Put the URL and key in `mobile/.env.local`.

**Check:** `supabase projects list` shows the project.

### C2. Deploy the database and functions

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy iap-confirm
supabase functions deploy app-store-notifications
supabase functions deploy delete-account
supabase secrets set APP_BUNDLE_ID=com.bbiom.app \
  IAP_PRODUCT_IDS=com.bbiom.app.pro.monthly,com.bbiom.app.pro.yearly
```

Now the website change from A6 may be deployed.

**Check:** the two `curl` commands in `05-backend.md` §9 print `401` and `400`;
the website's settings page still loads for a Stripe Pro account and a Free
account.

### C3. HUMAN — Supabase dashboard

The owner applies `05-backend.md` §7 (Apple provider with the bundle id under
Client IDs; Google provider; redirect URLs including `bbiom://auth/callback`;
the Magic Link template with `{{ .Token }}`). The template file in
`supabase/templates/magic_link.html` should match what is pasted.

**Check:** owner confirms each item.

### C4. HUMAN — Apple

The owner completes, in this order: Apple Developer membership; `07-payments.md`
§3 steps 1–7 (agreements, app record, subscription group and products, In-App
Purchase key, notification URLs, sandbox testers); a **Sign in with Apple key**
(Certificates, Identifiers & Profiles › Keys › +, enable Sign in with Apple,
configure it for the `com.bbiom.app` App ID, download the `.p8`); their Team ID.

Then set the secrets (the owner runs the commands with the `.p8` paths, or
pastes into the dashboard — never into chat):

```sh
supabase secrets set APPLE_IAP_ISSUER_ID=… APPLE_IAP_KEY_ID=… APPLE_TEAM_ID=… APPLE_SIWA_KEY_ID=…
supabase secrets set APPLE_IAP_PRIVATE_KEY="$(cat AuthKey_IAP.p8)"
supabase secrets set APPLE_SIWA_PRIVATE_KEY="$(cat AuthKey_SIWA.p8)"
supabase secrets set STRIPE_SECRET_KEY=…
```

Write the app's numeric Apple ID into `mobile/eas.json` (`ascAppId`).

**Check:** `supabase secrets list` shows every name in `05-backend.md` §6.

### C5. HUMAN — Domain

The owner applies `09-cloudflare-dns.md` §1 and §2 (and §3–4 if wanted).
Replace `YOUR_DOMAIN` in `mobile/src/lib/links.ts`.

**Check:** the `dig` and `curl` checks in `09-cloudflare-dns.md` §6;
`grep -rn YOUR_DOMAIN mobile/src` returns nothing.

### C6. HUMAN + agent — First device build

`10-build-release.md` §3–5: `eas login` (owner), `eas init`, add the project
id to `app.config.ts`, create the Expo environment variables, `eas device:create`
(owner opens the link on the iPhone), `eas build --profile development
--platform ios`, install, `npx expo start --dev-client`.

**Check:** the owner can sign in with Apple, with an email code and with
Google, and reaches the onboarding screen.

### C7. HUMAN + agent — Test on the device

Run `12-qa.md` §3 (purchases), §4 (the manual script), §5 (accessibility) and
§6 (offline and privacy) with the owner. Fix every failure in code, rebuild
when native config changed, re-run the failed rows.

**Check:** every row in those sections is marked pass.

### C8. Icon and splash

Replace `mobile/assets/images/icon.png` (1024×1024, no transparency) and
`splash-icon.png` per `03-design-system.md` §10. The agent may render them from
the web logo (`src/components/brand/logo.tsx`) with a script, as was done for
the artwork in `scripts/art`; the owner approves the result.

**Check:** `file mobile/assets/images/icon.png` reports 1024 x 1024 and RGB
(not RGBA); `npx expo prebuild --platform ios --no-install --clean` succeeds
(then delete the generated `ios/`).

### C9. HUMAN + agent — Release

`10-build-release.md` §5–9: production build, `eas submit`, TestFlight round
(repeat C7 §3 rows 1–3 on the TestFlight build), listing, App Privacy answers,
review notes, submit with both subscriptions attached.

**Check:** the security checklist in `08-security.md` §10 is complete, and the
build is "Waiting for Review".
