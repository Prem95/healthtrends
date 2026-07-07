import { createAdminClient } from "@/lib/supabase/admin";

export type Plan = "free" | "pro";

export type Entitlement = {
  plan: Plan;
  status: string;
  currentPeriodEnd: string | null;
  pastDue: boolean;
  limits: {
    maxProfiles: number;
    maxSessions: number; // total sessions across all profiles; Infinity for pro
    doctorSummary: boolean;
  };
};

export const PLAN_LIMITS: Record<Plan, Entitlement["limits"]> = {
  free: { maxProfiles: 1, maxSessions: 20, doctorSummary: false },
  pro: { maxProfiles: 6, maxSessions: Infinity, doctorSummary: true },
};

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
