# HealthTrends

A privacy-first personal lab-result tracker, built as a hosted SaaS ("Target B"):
Next.js (App Router) · Supabase (Postgres, Auth, RLS) · Stripe (Checkout + Billing
Portal) · Tailwind · Recharts · Zod. See `PRD-health-trends.md` / `PRD-saas-layer.md`
for the product spec.

## Local development

```bash
git clone <this repo> && cd healthtrends
npm install
cp .env.example .env.local   # fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Verification commands:

```bash
npm run test    # domain unit tests (vitest)
npm run lint    # eslint
npm run build   # production build
```

## 1. Supabase setup

1. Create a Supabase project (or `supabase init && supabase start` for a local stack).
2. Link and run migrations — schema, RLS and the built-in biomarker catalog are all
   in `supabase/migrations/` (no dashboard-only schema drift):

```bash
supabase link --project-ref <your-project-ref>
supabase db push              # applies supabase/migrations/*.sql
# or, with the local stack / CI:
supabase migration up
```

3. Auth configuration (Dashboard → Authentication):
   - **URL Configuration → Site URL:** your production URL.
   - **Redirect URLs:** add
     - `http://localhost:3000/**`
     - `https://<your-domain>/**`
     - `https://*-<your-team>.vercel.app/**` (preview deployments)
   - **Email templates:** set the app name to HealthTrends. The magic-link
     template must link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
     so cross-device sign-in works. No health data ever appears in emails.
   - **Google OAuth:** Authentication → Providers → Google. Create OAuth
     credentials in Google Cloud Console with redirect URI
     `https://<project-ref>.supabase.co/auth/v1/callback`, then paste the client
     ID/secret into Supabase.

4. RLS tests (run against a local/test database only — **never production**):

```bash
supabase db reset             # local db with all migrations applied
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
# prints "RLS TESTS PASSED" and rolls back
```

## 2. Stripe setup

1. Create a **Pro** product with two recurring prices: $4.99/month and $39/year.
   Put both price IDs in `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY`.
2. Enable the **Billing Portal** (Settings → Billing → Customer portal) — the app
   never builds custom billing UI.
3. Local webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

4. Production webhook: Dashboard → Developers → Webhooks → add endpoint
   `https://<your-domain>/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
   Use its signing secret as `STRIPE_WEBHOOK_SECRET` in production.

Test the flow with card `4242 4242 4242 4242` — plan flips to Pro when the
webhook lands (no page-refresh tricks). Webhook processing is idempotent by
event ID (`stripe_events` table).

## 3. Vercel deployment

1. Push the repo to GitHub, import into Vercel. `main` → production, every PR →
   preview deployment (broken builds never reach production).
2. Set the environment variables from `.env.example` per environment. Preview
   environments must point at Stripe **test mode** and a separate Supabase
   project or branch database — never production data.
3. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` are
   server-only: never prefix them with `NEXT_PUBLIC_`.
4. Add the production and preview URLs to Supabase Auth redirect URLs (step 1.3).
5. Migrations in CI: run `supabase db push` in a deploy step (or GitHub Action)
   so schema is applied before the new build serves traffic.

## Environment variables

Exactly the set from the SaaS PRD §7.1 (plus the two Stripe price IDs):

| Var | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** |
| `STRIPE_SECRET_KEY` | **server-only** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public |
| `STRIPE_WEBHOOK_SECRET` | **server-only** |
| `NEXT_PUBLIC_APP_URL` | public |
| `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY` | server-only |

## Architecture notes

- **Domain rules** (unit conversion, plausibility, status, trend) live in
  `src/lib/domain/` as pure TypeScript with unit tests. Statuses/trends are
  computed at read time, never stored — editing a range retroactively fixes flags.
- **Values are stored in canonical units only**; conversion happens at the edges.
  The lab-printed range on a result always overrides the catalog default.
- **RLS**: enabled (and forced) on every table; health rows chain to
  `auth.uid()` via `test_results → test_sessions → profiles.user_id`. Built-in
  biomarkers are readable by all/writable by none. `subscriptions` is
  SELECT-own-only; all writes go through the service-role key server-side.
- **Entitlements**: a single server-side `getPlan(userId)`
  (`src/lib/entitlements.ts`) backs both UI gating and API enforcement.
  Downgrades never delete data — over-limit items become read-only.
- **Export (CSV/JSON) and account deletion are free-tier features forever.**
  The doctor-ready printable summary is Pro.
- The built-in biomarker seed (`supabase/migrations/0003_seed_biomarkers.sql`)
  is generated — edit `scripts/biomarker-catalog.mjs` and run `npm run gen:seed`.
