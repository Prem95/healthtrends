// Replaces src/lib/entitlements.ts.
//
// The only change from the Stripe-only version: a user is also Pro while an
// App Store subscription is active (or in its billing grace period). This is
// the TypeScript twin of the SQL function public.user_is_pro() in migration
// 0006 — change one, change the other.

import { createAdminClient } from "@/lib/supabase/admin";

import { PLAN_LIMITS, type Entitlement, type Plan } from "@/lib/plan-limits";

export { PLAN_LIMITS };
export type { Entitlement, Plan };

/** Where an active Pro plan is billed, so the UI can point to the right place to manage it. */
export type PlanSource = "stripe" | "app_store" | null;

/** A renewal notification can arrive a little after the period ends. */
const APP_STORE_ALLOWANCE_MS = 24 * 60 * 60 * 1000;

/**
 * Single source of truth for a user's plan. Used by BOTH UI gating and API
 * enforcement. Reads the subscriptions row with the service-role client so RLS
 * timing/edge cases can never hide an active subscription.
 */
export async function getPlan(userId: string): Promise<Entitlement & { source: PlanSource }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end, app_store_status, app_store_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  const now = Date.now();

  // Stripe: active / trialing / past_due keep access; a cancelled subscription
  // keeps access until the end of the period that was paid for.
  const status = data?.status ?? "none";
  const periodEnd = data?.current_period_end ? new Date(data.current_period_end).getTime() : null;
  const stripeActive =
    data?.plan === "pro" &&
    (status === "active" ||
      status === "trialing" ||
      status === "past_due" ||
      (periodEnd != null && periodEnd > now));

  // App Store: active or in billing grace, and not lapsed.
  const appStoreEnd = data?.app_store_expires_at ? new Date(data.app_store_expires_at).getTime() : null;
  const appStoreActive =
    (data?.app_store_status === "active" || data?.app_store_status === "grace") &&
    (appStoreEnd == null || appStoreEnd > now - APP_STORE_ALLOWANCE_MS);

  const plan: Plan = stripeActive || appStoreActive ? "pro" : "free";

  return {
    plan,
    status,
    currentPeriodEnd: appStoreActive
      ? (data?.app_store_expires_at ?? null)
      : (data?.current_period_end ?? null),
    // The "payment failed" banner is about the Stripe card only.
    pastDue: status === "past_due" && !appStoreActive,
    limits: PLAN_LIMITS[plan],
    source: appStoreActive ? "app_store" : stripeActive ? "stripe" : null,
  };
}
