# 06 — Authentication

Implemented in `reference/mobile/src/lib/auth.tsx`, `supabase.ts` and
`secure-storage.ts`. Screens: `(auth)/index.tsx`, `(auth)/verify.tsx`.

## 1. Three ways in, one account

| Method | Why it is there | How |
| --- | --- | --- |
| **Sign in with Apple** | The fastest on an iPhone. Also **required by App Review guideline 4.8** because Google sign-in is offered. | Native sheet → Apple identity token → `supabase.auth.signInWithIdToken({ provider: 'apple', token })` |
| **Email, six-digit code** | Works for everyone; matches the website's "no passwords" promise | `signInWithOtp({ email })` then `verifyOtp({ email, token, type: 'email' })` |
| **Google** | People who created their account on the website with Google must be able to get in | System browser sheet, PKCE: `signInWithOAuth` → `openAuthSessionAsync` → `exchangeCodeForSession` |

All three end in the same Supabase session and the same `auth.users` row when
the email matches: Supabase links identities that share a **verified** email
automatically. So "Google on the web, Apple on the phone" is one account,
provided the Apple ID shares the real address.

**The one case to know about:** if someone chooses *Hide My Email* in the
Apple sheet, Apple supplies a private relay address, which does not match
their website account, and a **new, empty** account is created. The app cannot
detect this beforehand. Mitigation in v1: the sign-in screen offers email and
Google beside Apple, and the empty state of a brand-new account reads as
empty. If support requests show this happening, add account linking
(`supabase.auth.linkIdentity`) in Settings.

## 2. Why a code and not a magic link

A magic link has to leave Mail, pass through a universal link or URL scheme,
and re-open the app with the token intact. Each hop is a place for it to break
(link scanners that consume the token, the wrong browser, the app not
installed). A six-digit code has none of those: iOS even offers it above the
keyboard. The website keeps its link; both come from the same email template
(`05-backend.md` §7).

## 3. Session storage

```
Supabase session (access + refresh token)
   └─ secureStorage  →  iOS Keychain
        accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY
        split into 1800-character items  (key.0, key.1, …, key.n)
```

- **Keychain, not a file or SQLite.** The session is the key to someone's
  medical history. Expo's Supabase guide uses a SQLite-backed `localStorage`;
  that is unencrypted in the app container and travels in device backups, so
  this app does not use it.
- **`THIS_DEVICE_ONLY`** — the item is not restored onto another device from a
  backup and is not synced through iCloud Keychain.
- **`WHEN_UNLOCKED`** — unreadable while the phone is locked. The app never
  needs the session in the background.
- Chunking keeps each Keychain item small; a session with provider tokens can
  be several kilobytes.
- Keychain items can survive deleting the app. That is acceptable (the session
  expires and is refreshed or rejected by the server), and sign-out and account
  deletion both remove it explicitly.

The client is created with `flowType: 'pkce'`, `persistSession: true`,
`autoRefreshToken: true`, `detectSessionInUrl: false`. Token refresh runs only
while the app is active (`AppState` listener).

## 4. The flows

### Apple

1. `AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME, EMAIL] })`.
2. Pass `credential.identityToken` to `signInWithIdToken`.
3. A cancelled sheet throws `ERR_REQUEST_CANCELED` → `AuthCancelled` → the
   screen shows nothing.

Setup required (once): the App ID has the *Sign in with Apple* capability
(`ios.usesAppleSignIn: true` adds the entitlement and Expo's build service
enables the capability); the bundle identifier is listed under **Client IDs**
in the Supabase Apple provider. No Services ID and no client secret are needed
for the native flow.

### Email code

1. `sendEmailCode(email)` → `signInWithOtp({ email, options: { shouldCreateUser: true } })`.
2. Navigate to `/verify` with the address.
3. `verifyEmailCode(email, code)` → `verifyOtp({ email, token, type: 'email' })`.

Supabase limits code requests to one per 60 seconds per address and codes
expire after an hour. The copy for both is in `02-ux.md` §3.

### Google

1. `redirectTo = Linking.createURL('auth/callback')` → `bbiom://auth/callback`.
2. `signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })`
   returns the provider URL.
3. `WebBrowser.openAuthSessionAsync(url, redirectTo)` opens the system
   authentication sheet (not an in-app web view — Google blocks those) and
   resolves with the redirect URL.
4. Read `code` from it → `exchangeCodeForSession(code)`.

`bbiom://auth/callback` must be in Supabase's redirect allow-list. The route
`src/app/auth/callback.tsx` exists only so the URL is never an unmatched
route; it redirects home.

## 5. Signing out and deleting

- **Sign out** uses `scope: 'local'`: this device only. `onAuthStateChange`
  then clears the in-memory query cache and deletes the cache file.
- **Delete account** (`deleteAccount()`): for an Apple user it first asks for a
  fresh Apple authorization (the system sheet, once) so the server can revoke
  the Sign in with Apple grant — Apple requires apps that offer Sign in with
  Apple to revoke tokens when an account is deleted. If the person cancels that
  sheet the account is still deleted. Then it calls the `delete-account`
  function and signs out locally.

## 6. Route protection

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Protected guard={!!session}>
    <Stack.Screen name="(app)" />
  </Stack.Protected>
  <Stack.Protected guard={!session}>
    <Stack.Screen name="(auth)" />
  </Stack.Protected>
  <Stack.Screen name="auth/callback" />
</Stack>
```

This is navigation hygiene, not security: it decides what the person sees.
What they can *read* is decided in Postgres. A screen in `(app)` rendered
without a session would simply receive empty results.

## 7. Checklist

- [ ] Apple provider enabled in Supabase with the bundle id under Client IDs
- [ ] `bbiom://auth/callback` in Supabase redirect URLs
- [ ] Magic Link template contains both `{{ .ConfirmationURL }}` and `{{ .Token }}`
- [ ] Custom SMTP configured (the built-in sender is rate-limited to a few emails an hour)
- [ ] On a device: Apple, code and Google each reach the Overview
- [ ] Sign out, then relaunch: lands on sign-in, and no previous data flashes
- [ ] An account created with Google on the web opens the same data in the app
