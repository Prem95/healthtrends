// Plan limits, free of any server dependency so marketing pages can quote the
// same numbers the app enforces. getPlan() in lib/entitlements applies them.

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
