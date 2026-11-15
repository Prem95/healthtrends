# 07 — Payments: App Store subscriptions

Client: `reference/mobile/src/lib/purchases.tsx`, screen `(app)/paywall.tsx`.
Server: `iap-confirm`, `app-store-notifications`, and the SQL in migration 0006
(`05-backend.md`).

## 1. The rules this design follows

1. **Digital features in an iOS app are sold through the App Store** (Review
   Guideline 3.1.1). The app does not show, link to, or mention the website's
   checkout.
2. **The device is never the authority.** StoreKit on the phone says "a
   purchase happened"; the server asks Apple and decides. Pro is read from the
   database.
3. **A payment is never lost.** A transaction is finished only after the
   server has recorded it. Until then StoreKit redelivers it on every launch.
4. **One subscription, one account.** Each purchase carries the buyer's bbiom
   user id (`appAccountToken`); the database refuses to attach it to anyone
   else.
5. **Web and app add up.** Pro from Stripe and Pro from the App Store are both
   just "Pro"; the two are stored in separate columns and neither writer can
   undo the other.

## 2. Products

| | Monthly | Yearly |
| --- | --- | --- |
| Product ID | `com.bbiom.app.pro.monthly` | `com.bbiom.app.pro.yearly` |
| Type | Auto-renewable subscription | Auto-renewable subscription |
| Duration | 1 month | 1 year |
| Price (US) | $4.99 | $39.99 (the App Store price point nearest the website's $39) |
| Subscription group | `bbiom Pro` | `bbiom Pro` |
| Level in the group | 1 | 1 (same level: switching is a crossgrade) |
| Family Sharing | off | off |
| Introductory offer | none in v1 | none in v1 |

The product ids appear in exactly three places and must match: App Store
Connect, `PRODUCT_IDS` in `mobile/src/lib/purchases.tsx`, and the function
secret `IAP_PRODUCT_IDS`.

## 3. App Store Connect setup — HUMAN

In this order. Products cannot be fetched, even in the sandbox, until step 1
is complete.

1. **Business › Agreements, Tax, and Banking**: accept the *Paid Applications*
   agreement and complete banking and tax. Wait for the status "Active".
2. **Apps › +  New App**: platform iOS, bundle ID `com.bbiom.app` (register it
   first under Certificates, Identifiers & Profiles if it is not offered),
   SKU of your choice. Note the numeric **Apple ID** of the app: it is
   `ascAppId` in `mobile/eas.json`.
3. **Monetization › Subscriptions**: create the group `bbiom Pro`, then the
   two subscriptions from the table above. For each: reference name, product
   ID, duration, price, and at least one localisation (display name
   "bbiom Pro (monthly)" / "(yearly)", description "Up to six profiles,
   unlimited tests, and a doctor-ready summary."). Add a localisation for the
   group itself too.
4. Each subscription needs **Review Information** before it can be submitted:
   a screenshot of the paywall and a note ("Unlocks additional profiles,
   unlimited tests and the doctor summary. Sign in with the demo account in
   App Review notes.").
5. **Users and Access › Integrations › In-App Purchase**: generate a key.
   Download the `.p8` (once), and copy the **Key ID** and the **Issuer ID**
   shown on that page. These become `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`
   and `APPLE_IAP_PRIVATE_KEY`.
6. **App Information › App Store Server Notifications**: set both the
   **Production Server URL** and the **Sandbox Server URL** to

   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/app-store-notifications
   ```

   and choose **Version 2**. (Use the custom API domain here instead if you set
   one up in `09-cloudflare-dns.md`.)
7. **Users and Access › Sandbox**: create at least two sandbox test accounts
   (two, to test the "belongs to another account" case).
8. The first subscriptions must be submitted **together with an app version**:
   on the version page, under *In-App Purchases and Subscriptions*, select
   both before submitting for review.

## 4. Client flow

```
paywall: buy(sku)
  └─ requestPurchase({ request: { apple: { sku, appAccountToken: userId } }, type: 'subs' })
       └─ StoreKit sheet (Face ID / double-click)
            └─ purchase delivered to the purchase flow
                 └─ confirmWithBackend(purchase)
                      └─ POST iap-confirm { store, purchaseToken (JWS), productId }
                           └─ verdict
                                ├─ entitled              → finishTransaction → refresh entitlement
                                ├─ ownership_conflict    → finishTransaction → tell the person
                                ├─ invalid               → finishTransaction
                                └─ verification_delayed  → NOT finished → redelivered and retried
```

This is expo-iap's own purchase flow (`createPurchaseFlow` + `useIAP({
purchaseFlow })`), which exists precisely to do "confirm with your backend,
then finish". What the app adds is in `PurchasesProvider`:

- **One flow per signed-in account**, created with `useMemo` on the user id
  and disposed when it changes, so a purchase can never be confirmed under the
  wrong session.
- `confirmWithBackend` returns `verification_delayed` for *any* failure to
  reach the function. It never returns `invalid` on its own judgement.
- On every outcome it invalidates the `['entitlement']` query. The UI shows
  Pro because `my_entitlement()` says so, not because the purchase callback
  fired.
- **Recovery is automatic**: when the store connects, the flow re-confirms any
  unfinished transactions (a purchase interrupted by a crash, a dead
  connection, or an Ask-to-Buy approval that arrived later).
- **Restore purchases** runs `flow.recoverPurchases({ includeFinished: true })`,
  which re-confirms everything the Apple Account owns.
- **Manage subscription** calls `deepLinkToSubscriptions({})`, which opens
  Apple's own management sheet. Cancelling, changing plan and refunds all
  happen there; the app never implements them.
- Prices on the paywall come from `products[].displayPrice`, already localised
  and in the person's currency. Never hard-code a price in the app.

Mapping outcomes to words is `NOTICE_COPY` in `purchases.tsx`
(`02-ux.md` §10). `offerPurchase` semantics matter: never invite someone who
may already have paid to buy again.

## 5. Server flow

`iap-confirm` and `app-store-notifications` are described in
`05-backend.md` §4. In one paragraph: read the transaction id out of what was
sent; ask the App Store Server API for that transaction and for the current
state of its subscription; map Apple's status to ours; call
`apply_app_store_subscription`, which enforces ownership; answer.

Apple status → ours → Pro?

| Apple `status` | Meaning | Stored as | Pro |
| --- | --- | --- | --- |
| 1 | Active | `active` | yes |
| 4 | Billing grace period | `grace` | yes, until the grace date |
| 3 | Billing retry | `billing_retry` | no |
| 2 | Expired | `expired` | no |
| 5 | Revoked (refunded) | `revoked` | no |

A missed notification cannot leave someone Pro forever: `user_is_pro()` also
requires `app_store_expires_at` to be no more than a day in the past, and the
next time the app runs a restore or a recovery the state is re-read.

## 6. Web and app together

| Situation | App | Website |
| --- | --- | --- |
| Pro via App Store | Settings shows renewal date and **Manage subscription** | Shows Pro; "bought in the iPhone app, manage it in your App Store subscriptions"; checkout refused |
| Pro via Stripe | Paywall and Settings say "through the bbiom website"; no purchase buttons | Unchanged |
| Both (should not happen; possible if bought on two devices before sync) | Pro. Tell the person in Settings which two exist | Pro |
| Neither | Paywall | Checkout |

The guard that prevents the "both" case from the website side is the small
change to `startCheckout` in `05-backend.md` §8. From the app side, the paywall
hides the plans when `entitlement.plan === 'pro'`.

## 7. Edge cases, and what happens

| Case | Result |
| --- | --- |
| App killed between payment and confirmation | Transaction is unfinished; recovered and confirmed at next launch |
| No network at the moment of purchase | `verification_delayed`; message says the purchase is not lost; retried |
| Ask to Buy (child account) | "Waiting for approval"; when approved, StoreKit delivers it and the flow confirms it |
| Person signs out and into a second bbiom account, taps Restore | `ownership_conflict`: "already belongs to a different bbiom account" |
| Subscription bought outside the app (offer code, App Store page) | No `appAccountToken`; attached to the account that first confirms it |
| Renewal | Notification → state re-read → `app_store_expires_at` moves forward |
| Card fails | `DID_FAIL_TO_RENEW` → `billing_retry` (or `grace` if you enable a grace period) |
| Refund | `REFUND` → `revoked` → Free; data stays, limits apply to new rows |
| Cancelled | Stays Pro until `app_store_expires_at`, then `expired` |
| Monthly → yearly | Same group, same level: crossgrade; the notification carries the new product |
| Account deleted while subscribed | Data deleted; the app tells the person to cancel in Apple's settings (we cannot) |
| Apple's API down during a notification | Function answers 503; Apple retries |

Recommended setting in App Store Connect: enable a **Billing Grace Period**
(16 days) for the group, so a failed card does not immediately cost someone
their extra profiles.

## 8. Testing purchases

There are three environments; all hit the same Edge Functions.

| Where | Apple environment | Use for |
| --- | --- | --- |
| Development build on a device, signed into a **sandbox** Apple Account | Sandbox | Day-to-day testing. Subscriptions renew every few minutes. |
| TestFlight build | Sandbox (no charge) | The real pre-release test |
| App Store build | Production | Real money |

Sandbox on a device: **Settings › Developer › Sandbox Apple Account** (shown
once a development build has been run on the device). Do not sign the sandbox
account into the main App Store.

The test matrix to run before submitting is in `12-qa.md` §3. The first row —
buy monthly in the sandbox and see Pro appear — is the proof that the keys,
secrets, product ids and notification URL are all right. If it fails, look at
the `iap-confirm` logs (`supabase functions logs iap-confirm`): a 401 from
Apple means the issuer id, key id or key is wrong; a 404 on both environments
means the bundle id in the token does not match the app.

## 9. What App Review checks on a subscription app

- Price, period and what you get are shown before the purchase button
- The auto-renewal terms are on the paywall
- **Restore purchases** exists and works
- Links to **Terms of use** and **Privacy policy** on the paywall and in the
  App Store listing (`10-build-release.md` §6)
- The purchase works in their sandbox, and the feature it unlocks is real
- The app is useful without subscribing (it is: tracking is free)
- Account deletion is possible in the app

Replace the URLs in `mobile/src/lib/links.ts` (`PRIVACY_URL`, `SUPPORT_URL`,
and `TERMS_URL` if you publish your own terms) before submitting. Using
Apple's standard EULA is fine; the privacy policy must be your own page.
