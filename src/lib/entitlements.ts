import { createAdminClient } from "@/lib/supabase/admin";

import { PLAN_LIMITS, type Entitlement, type Plan } from "@/lib/plan-limits";

export { PLAN_LIMITS };
export type { Entitlement, Plan };

/**
 * Single source of truth for a user's plan. Used by BOTH UI gating and API
 * enforcement. Reads the subscriptions row with the service-role client so RLS
 * timing/edge cases can never hide an active subscription. A subscription is
 * "pro" only while it is active/trialing OR still within a paid period that has
 * been cancelled (access until current_period_end). Expired → free.
 */
export async function getPlan(userId: string): Promise<Entitlement> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const now = Date.now();
  const periodEnd = data?.current_period_end ? new Date(data.current_period_end).getTime() : null;
  const withinPeriod = periodEnd != null && periodEnd > now;

  let plan: Plan = "free";
  const status = data?.status ?? "none";

  if (data?.plan === "pro") {
    // active / trialing / past_due keep access; a cancelled sub keeps access
    // until the period end. Anything else (expired, no period) → free.
    if (status === "active" || status === "trialing" || status === "past_due") {
      plan = "pro";
    } else if (withinPeriod) {
      plan = "pro";
    }
  }

  return {
    plan,
    status,
    currentPeriodEnd: data?.current_period_end ?? null,
    pastDue: status === "past_due",
    limits: PLAN_LIMITS[plan],
  };
}
