# bbiom — SaaS (Target B)

Personal lab-test history tracker as hosted SaaS. Specs: `~/Downloads/PRD-health-trends.md` (product) + `~/Downloads/PRD-saas-layer.md` (this layer).

## Status (2026-07-13)
S1–S4 code-complete, built locally, NOT deployed. Verified: build/lint/tsc clean, 28/28 domain vitest, RLS tests pass on local Supabase stack, live E2E smoke (auth redirect, magic link, onboarding, dashboard trend/range flags, export gates, webhook signature rejection, security headers).
Design (2026-11-15, redesign): "The well-kept record" replaces "Clear chart" — warm paper, one-word Funnel Display titles + Funnel Sans, one cobalt accent, no italics, gradients or artwork; reasoning in `design-notes.md`, rules in CLAUDE.md Design Context, marketing components in `src/components/site/`.
Design (2026-11-14, full redesign): "Clear chart" system replaces Alethia everywhere — see CLAUDE.md Design Context. Product-led landing built from real app components over sample data; public read-only sample dashboard at `/demo` (closes the §9.6 demo-fixture gap); app shell with desktop sidebar + mobile tab bar; overview leads with "N of M in range", attention cards, body-system cards. Product screens are shared views (`src/components/views/`) rendered by `/app` and `/demo` through `ViewCtx`. Status = shape + label + colour (validated palette). Custom SVG charts only; `recharts` and `motion` dependencies removed. Gradient pass (same day, user-directed from Superpower + painterly split-hero references): one evergreen→orange gradient family as painted artwork (`public/art`, generator in `scripts/art`), frosted-glass product cards on it, soft washes, pill buttons. Screenshot-verified at 1440px and 390px.

## Stack
Next.js 16 (App Router, TS) · Supabase (Postgres/Auth/RLS, @supabase/ssr) · Stripe (Checkout + Portal + webhook, Free/Pro $4.99mo|$39yr) · Tailwind v4 · lucide-react · Zod · vitest.

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
Borderline rule over-flags narrow two-sided ranges: margin is 10% of the *boundary value*, so e.g. sodium 135–145 or calcium 8.6–10.3 can never be plain "in range" (every in-range value is within 10% of a limit). Spec'd + tested (PRD C3), so left as is; consider capping the margin by range width. Compare view (B3); edit-in-place for saved results; borderline-threshold settings UI; auth rate limiting; nightly Stripe reconciliation. ⚠️ unverified: Stripe webhook happy path (needs `stripe listen`), account-deletion E2E (needs real Stripe key).

## Related
Prototype (Target A, single-file HTML, M1–M4 complete): `/Users/prem/healthtrends-artifact/dist/healthtrends.html`.
