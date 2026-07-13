# bbiom — SaaS (Target B)

Personal lab-test history tracker as hosted SaaS. Specs: `~/Downloads/PRD-health-trends.md` (product) + `~/Downloads/PRD-saas-layer.md` (this layer).

## Status (2026-07-13)
S1–S4 code-complete, built locally, NOT deployed. Verified: build/lint/tsc clean, 28/28 domain vitest, RLS tests pass on local Supabase stack, live E2E smoke (auth redirect, magic link, onboarding, dashboard trend/range flags, export gates, webhook signature rejection, security headers).
Design: landing = light Alethia; product app + login/onboarding rebuilt to the DARK Alethia system (2026-07-13, `design_handoff_alethia_design_system 6` "Marker" screens) — `.aurora[data-theme="dark"]` token layer in globals.css, custom SVG marker chart (recharts now landing-only), mono control language, mobile bottom tab bar. Screenshot-verified against the handoff mocks.

## Stack
Next.js 16 (App Router, TS) · Supabase (Postgres/Auth/RLS, @supabase/ssr) · Stripe (Checkout + Portal + webhook, Free/Pro $4.99mo|$39yr) · Tailwind + shadcn/ui · Recharts · Zod · vitest.

## Key structure
- `supabase/migrations/` — 0001 schema (6 PRD tables + watched_biomarkers + stripe_events idempotency), 0002 RLS (forced, owns_profile() chain to auth.uid()), 0003 seed (71 built-in biomarkers, generated via `npm run gen:seed` from `scripts/biomarker-catalog.mjs`)
- `src/lib/domain/` — pure units/status/trend/plausibility logic (canonical-unit storage, lab-range overrides catalog, read-time status, monotonic-3+≥10% trend)
- `src/lib/entitlements.ts` — single `getPlan()` for UI + API gating; export/delete never paywalled
- `/api/stripe/webhook` — signature-verified, idempotent by event ID

## To go live (README has details)
1. Supabase project → `supabase db push`, auth redirect URLs, magic-link template
2. Google OAuth creds → Supabase provider
3. Stripe Pro product (2 price IDs), Portal on, webhook (4 events)
4. Vercel import + env vars (previews → test-mode Stripe + separate Supabase)

## Known gaps
Compare view (B3); edit-in-place for saved results; unit display preference UI (D3); borderline-threshold settings UI; demo fixture (§9.6); auth rate limiting; nightly Stripe reconciliation. ⚠️ unverified: Stripe webhook happy path (needs `stripe listen`), account-deletion E2E (needs real Stripe key).

## Related
Prototype (Target A, single-file HTML, M1–M4 complete): `/Users/prem/healthtrends-artifact/dist/healthtrends.html`.
