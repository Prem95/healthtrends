# 10 — Build and release

From a working local project to an app in the App Store. Builds run on Expo's
build service (EAS), so a Mac is not required; one helps for the Simulator.

## 1. Tools and accounts

| Need | How |
| --- | --- |
| Node.js 22 LTS or newer | `node -v` |
| EAS CLI | `npm install -g eas-cli`, then `eas login` |
| Expo account | expo.dev (free tier is enough) |
| Apple Developer Program | developer.apple.com, as the Account Holder or an Admin |
| An iPhone running iOS 16.4+ | Purchases, Face ID and Sign in with Apple need a real device |

**The app does not run in Expo Go.** It uses native modules that Expo Go does
not contain (StoreKit through expo-iap, Sign in with Apple, the data-protection
entitlement). Every run on a device or Simulator uses a **development build**:
your own copy of the app with `expo-dev-client`, which then loads JavaScript
from your computer like Expo Go does.

## 2. Configuration you own

`mobile/app.config.ts` holds everything Apple sees. Before the first build:

| Field | Value | Note |
| --- | --- | --- |
| `name` | `bbiom` | Home-screen name (≤ 30 characters; keep it short) |
| `version` | `1.0.0` | Marketing version; raise it for each App Store release |
| `ios.bundleIdentifier` | `com.bbiom.app` | Permanent once the app is created in App Store Connect |
| `scheme` | `bbiom` | Google sign-in redirect `bbiom://auth/callback` |
| `extra.eas.projectId` | from `eas init` | see §3 |

Build numbers are managed by EAS (`"appVersionSource": "remote"` and
`"autoIncrement": true` in `eas.json`), so you never edit them.

Do not add `expo-updates` in v1. Every change ships as a reviewed store build:
simpler, and there is no channel through which unreviewed code reaches a
phone holding health data.

## 3. Link the project to Expo

```sh
cd mobile
eas init
```

Because the config is a TypeScript file, `eas init` cannot edit it and prints
the project id instead. Add it to `app.config.ts`:

```ts
const config: ExpoConfig = {
  // …
  owner: 'YOUR_EXPO_ACCOUNT',          // only if the project belongs to an organisation
  extra: { eas: { projectId: 'THE-ID-EAS-PRINTED' } },
};
```

Run `eas init` again; it should now report the project as linked.

## 4. Environment variables for builds

`.env.local` is for your machine only and is not uploaded. Builds read Expo
environment variables, one set per environment named in `eas.json`
(`development`, `preview`, `production`):

```sh
for env in development preview production; do
  eas env:create --environment $env --name EXPO_PUBLIC_SUPABASE_URL \
    --value https://YOUR_PROJECT_REF.supabase.co --visibility plaintext
  eas env:create --environment $env --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    --value sb_publishable_xxx --visibility plaintext
done
eas env:list --environment production
```

(Flags change between EAS CLI releases; `eas env:create --help` is
authoritative.) Both values are public and end up inside the app; they are
`plaintext` because there is nothing to hide. **No other variable is ever
added here** — a secret in an `EXPO_PUBLIC_` variable is a secret published in
every copy of the app.

To use a separate Supabase project for development, give the `development`
environment that project's URL and key; the production build is unaffected.

## 5. Builds

### Development build (daily work)

```sh
eas device:create                                   # once per iPhone: registers it (open the link on the phone)
eas build --profile development --platform ios      # on a device
eas build --profile development-simulator --platform ios   # or for the Simulator (Mac only)
```

Install it from the link EAS prints (or the QR code), then:

```sh
npx expo start --dev-client
```

The first build asks to sign in to your Apple account and offers to create the
distribution certificate and provisioning profile: accept. EAS also enables the
**Sign in with Apple** capability on the App ID because the config declares it.
If it asks about push notifications, answer no — the app sends none.

Rebuild only when native configuration changes (a new native package, a
plugin, `app.config.ts` `ios.*` fields, the icon). JavaScript changes reload
instantly.

### Production build and TestFlight

```sh
eas build --profile production --platform ios
eas submit --platform ios --latest
```

`eas submit` uploads to App Store Connect (set `ascAppId` in `eas.json` to the
app's Apple ID from App Store Connect › App Information). The first time, let
it create an App Store Connect API key and store it with Expo.

About 10–30 minutes later the build appears in TestFlight. Add yourself under
**Internal Testing**; internal testers get builds without review. TestFlight
builds use the **sandbox** for purchases and are never charged.

## 6. Pages the App Store requires on the website

Create three pages in the website (`src/app/privacy/page.tsx`,
`src/app/terms/page.tsx`, `src/app/support/page.tsx`), styled like the rest of
the site and linked from its footer. They must be public, with no sign-in.

**Privacy policy** — have it reviewed by someone qualified for your
jurisdiction; this is a list of what it must cover, not legal text:

- Who runs the service and how to contact them.
- What is collected: email address; name if supplied by Apple or Google; the
  health information the person enters (results, ranges, profiles of family
  members, life events, notes); subscription status; technical logs kept by
  the hosting providers.
- Why: only to provide the service. Not sold, not shared for advertising, not
  used for tracking, not used to train models.
- Who processes it: Supabase (database and authentication — state the region
  of your project), Apple (Sign in with Apple, App Store payments), Google
  (sign-in, if used), Stripe (web payments), your email provider (sign-in
  codes), Vercel (website hosting).
- Profiles for other people: the account holder is responsible for having the
  right to record a family member's results.
- Storage and security in plain words: encrypted in transit, access limited to
  the account by the database, optional Face ID lock, an offline copy on the
  phone that is excluded from backups.
- Retention and deletion: kept until deleted; deleting a result, a profile or
  the whole account (in the app or on the website) removes it; how long
  provider backups persist.
- Export: CSV and JSON, free, at any time.
- The person's rights where they live (access, correction, deletion,
  portability, complaint to a regulator) and how to exercise them.
- Children: not directed at children; a parent may record a child's results.
- That bbiom is not a medical service and gives no medical advice.

**Terms of use** — or keep `TERMS_URL` pointing at Apple's standard EULA and
make this page say so, with the medical disclaimer and subscription terms.

**Support** — a contact address (`support@YOUR_DOMAIN`, see
`09-cloudflare-dns.md` §2), and short answers to: how to export, how to delete
the account, how to cancel or change the subscription (in iPhone Settings ›
Apple Account › Subscriptions), how to restore a purchase, why a new account
appeared after "Hide My Email".

## 7. App Store Connect: the listing

**App Information**
- Name: `bbiom` — plus a subtitle (≤ 30 characters), e.g. "Your blood tests, over time".
- Category: Health & Fitness (secondary: Medical, optional).
- Content rights: no third-party content.
- Age rating questionnaire: answer every question honestly; the app has no
  user-generated content shared with others, no web browsing, no gambling.
- Privacy policy URL: `https://YOUR_DOMAIN/privacy`.

**Pricing and Availability**: Free, with in-app purchases. Choose countries
deliberately: the privacy policy and the medical disclaimer must hold in each.

**Version page**
- Screenshots: the set for the largest iPhone size App Store Connect asks for
  (it scales them for smaller phones). Take them from the real app on a
  Simulator or device with realistic sample data (the values from
  `src/lib/demo.ts`). No device frames, no invented testimonials (`CLAUDE.md`
  anti-references apply to the listing too). Suggested five: Overview, a marker
  detail with its line, Add results, Timeline, the doctor summary.
- Description: what it does today, in the product's voice. Say "your lab's
  range, not a textbook one"; never say diagnose, detect, predict, or
  recommend.
- Keywords, support URL (`https://YOUR_DOMAIN/support`), marketing URL
  (`https://YOUR_DOMAIN`).
- Under **In-App Purchases and Subscriptions**, select both subscriptions for
  the first submission (`07-payments.md` §3).

## 8. App Privacy ("nutrition label")

App Store Connect › App Privacy. Answer **exactly** as the privacy manifest in
`app.config.ts` says; App Review compares them.

| Data type | Collected | Linked to the person | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact Info › Email Address | yes | yes | no | App Functionality |
| Contact Info › Name | yes | yes | no | App Functionality |
| Identifiers › User ID | yes | yes | no | App Functionality |
| Health & Fitness › Health | yes | yes | no | App Functionality |
| Purchases › Purchase History | yes | yes | no | App Functionality |

Everything else: not collected. (No crash data, no usage data, no
diagnostics — there is no SDK collecting them.) If you ever add one, update
the label and `privacyManifests` together.

## 9. App Review

### Notes for the reviewer (paste and adjust)

> bbiom is a personal record of blood test results that the user types in from
> their lab report. It does not diagnose, interpret or give medical advice;
> the reference range shown for each value is the one printed by the user's
> lab.
>
> Sign in: use Sign in with Apple on the first screen. A new account starts
> empty. To see the main features, tap Add results on the Overview, choose a
> date and the "Comprehensive Metabolic" panel shortcut, type a few values
> (for example fasting glucose 92, sodium 140), and save. Add a second test with a different date to see a
> trend line.
>
> Subscriptions (bbiom Pro, monthly and yearly) unlock additional family
> profiles, unlimited tests and a printable doctor summary. Tracking, charts
> and export are free. Restore Purchases is on the subscription screen;
> Manage Subscription is in Settings.
>
> Account deletion: Settings › Delete account.

If App Review asks for a demo account, reply that sign-in has no passwords and
Sign in with Apple creates an account in one step; offer the steps above.

### The guidelines this app touches, and where each is satisfied

| Guideline | Requirement | Where |
| --- | --- | --- |
| 1.4.1 Physical harm (medical) | Clear about what it does; no unverified medical claims; reminds people to consult a doctor | Disclaimer on the sign-in screen, in Settings and on the doctor summary; plain-word states; no diagnosis anywhere |
| 2.1 App completeness | No placeholders, no crashes, backend live during review | `12-qa.md` §1 "no stub text" check; production functions deployed |
| 2.3 Accurate metadata | Screenshots and text match the app | §7 |
| 3.1.1 In-app purchase | Digital features sold only through IAP; no links to other purchase methods | `07-payments.md` §1 |
| 3.1.2 Subscriptions | Ongoing value; price, period and auto-renew terms before purchase; restore | Paywall (`02-ux.md` §10) |
| 4.8 Login services | Offers Sign in with Apple because it offers Google | `06-auth.md` §1 |
| 5.1.1(i) Privacy policy | Linked in App Store Connect **and** inside the app | `lib/links.ts`, Settings › About, paywall |
| 5.1.1(v) Account deletion | Initiated in the app, deletes the account, not just deactivates | Settings, `delete-account`; Apple token revoked |
| 5.1.2 Data use | No sharing for advertising, no tracking | `08-security.md` §6 |
| 5.1.3 Health data | Not used for advertising or data mining; not stored in iCloud | `08-security.md` |

### Common rejections and the fix

- **"We were unable to purchase"** — the Paid Applications agreement is not
  active, the subscriptions were not submitted with the version, or the
  product ids differ. Check `07-payments.md` §3.
- **"Unable to sign in"** — the Supabase Apple provider is missing the bundle
  id in Client IDs, or the production Expo environment points at the wrong
  project.
- **Metadata about medical claims** — remove any word that suggests the app
  evaluates health.

## 10. After the first release

- Raise `version` in `app.config.ts` for every App Store release; EAS raises
  the build number.
- Each release: `12-qa.md` §1 and §4 in full, the purchase matrix's first three
  rows, the security checklist in `08-security.md` §10.
- Watch for one number above all: purchases charged but not unlocked. Find
  them with:

  ```sql
  select notification_type, subtype, original_transaction_id, received_at
  from app_store_notifications
  where original_transaction_id not in (
    select app_store_original_transaction_id from subscriptions
    where app_store_original_transaction_id is not null)
  order by received_at desc;
  ```

  Any row here is a subscription Apple knows about that is attached to no
  account (often a purchase never opened in the app, which is fine — or a
  failure in `iap-confirm`, which is not).
- Upgrade the Expo SDK one major version at a time, following Expo's upgrade
  guide, and re-run every check in `12-qa.md`.
