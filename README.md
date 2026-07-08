# HealthTrends

Turn a stack of lab PDFs into a story you can actually read. HealthTrends is a
privacy-first personal lab-result tracker: log the numbers from each blood test,
and it shows you each biomarker as a clear line over the years — in range,
borderline, or out — instead of a table you have to decode.

Built as a hosted SaaS: **Next.js 16** (App Router) · **React 19** · **Supabase**
(Postgres, Auth, RLS) · **Stripe** (Checkout + Billing Portal) · **Tailwind** ·
**Recharts** + **three.js / React Three Fiber** · **Motion** · **Zod**.

See `PROJECT_CONTEXT.md` for current status, stack, and known gaps.

## What's in the product

Two surfaces, one codebase:

- **Landing** (`/`) — a single light, editorial page. The hero *is* a real chart.
- **The app** (`/app/**`) — a calm dark workspace for your own data.

Inside the app:

| Route | What it does |
|---|---|
| `/app` | Dashboard — watched biomarkers with their latest value, status, and trend |
| `/app/biomarkers` · `/[id]` | Browse the full catalog (most-common markers first) and drill into one marker's full history |
| `/app/body` | 3D body map — an interactive mannequin that pins each result category to the organ it relates to |
| `/app/timeline` | Every test session over time, annotated with your own life events |
| `/app/summary` | A doctor-ready printable summary (**Pro**) |
| `/app/sessions/new` | Add a lab session and its results, with duplicate-result warnings |
| `/app/settings` | Profiles, plan/billing, data export, and account deletion |

- **Multiple profiles** — track your own results and your family's from one
  account (`profile-switcher`).
- **70+ built-in biomarkers** across lipids, glucose, thyroid, CBC, liver,
  kidney, vitamins, iron, and hormones — each with sensible default ranges you
  can override with your own lab's printed range.
- **Status & trend are computed, never stored** — green/amber/red and
  rising/falling/stable are derived at read time, so fixing a range retroactively
  fixes the flags.
- **Export (CSV/JSON) and account deletion are free forever.** The printable
  doctor summary is the one Pro feature.

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
npm run lint    # eslint (src + scripts)
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

| Var | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** |
| `STRIPE_SECRET_KEY` | **server-only** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public |
| `STRIPE_WEBHOOK_SECRET` | **server-only** |
| `NEXT_PUBLIC_APP_URL` | public |
| `STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_YEARLY` | **server-only** |

## Architecture notes

- **Domain rules** (unit conversion, plausibility, status, trend, panels) live in
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
- **Body map** (`src/app/app/body`) is a procedural three.js figure rendered with
  React Three Fiber; `src/lib/body-map.ts` pins each biomarker category to an
  organ region and colors it by that category's worst current status.
- **Catalog ordering** (`src/lib/commonality.ts`) surfaces the markers people
  recognize (glucose, cholesterol, a CBC) ahead of niche assays.
- **Charts** are shared, small components (`src/components/charts/` sparkline +
  range-bar; Recharts for the larger history views) so the line reads the same
  everywhere.
- The built-in biomarker seed (`supabase/migrations/0003_seed_biomarkers.sql`)
  is generated — edit `scripts/biomarker-catalog.mjs` and run `npm run gen:seed`.
