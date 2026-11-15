// POST /functions/v1/delete-account          (signed-in user)
// Body: { "confirm": "DELETE", "appleAuthorizationCode"?: string }
//
// In-app account deletion (App Store Review Guideline 5.1.1(v)). Mirrors the
// web's deleteAccount action:
//   1. cancel a Stripe subscription, if there is one
//   2. revoke Sign in with Apple tokens, if the app sent a fresh code
//   3. delete every row the user owns, then the auth user itself
// An App Store subscription cannot be cancelled by us: the response says
// whether one is still active so the app can send the user to Apple's
// subscription settings.

import { withSupabase } from "npm:@supabase/server@1";
import { loadSiwaConfig, revokeSignInWithApple } from "../_shared/apple.ts";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });
    const userId = ctx.userClaims?.id;
    if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

    let body: { confirm?: string; appleAuthorizationCode?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }
    if (body.confirm !== "DELETE") return Response.json({ error: "confirmation_required" }, { status: 400 });

    const admin = ctx.supabaseAdmin;
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id, app_store_status, app_store_expires_at, app_store_auto_renew")
      .eq("user_id", userId)
      .maybeSingle();

    // 1. Stripe: cancel so a deleted account is never billed again.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (sub?.stripe_subscription_id && stripeKey) {
      try {
        await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${stripeKey}` },
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        // Already cancelled or Stripe unreachable: deletion proceeds regardless.
      }
    }

    // 2. Sign in with Apple: best effort.
    let appleRevoked: boolean | null = null;
    const siwa = loadSiwaConfig();
    if (siwa && typeof body.appleAuthorizationCode === "string" && body.appleAuthorizationCode.length < 4000) {
      appleRevoked = await revokeSignInWithApple(siwa, body.appleAuthorizationCode);
    }

    // 3. Data, then identity. Every table cascades from profiles or auth.users;
    //    the explicit deletes make the order and intent obvious.
    for (const table of ["profiles", "biomarkers", "unit_preferences", "subscriptions"] as const) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) {
        console.error(`delete-account: ${table}`, error.message);
        return Response.json({ error: "delete_failed" }, { status: 500 });
      }
    }
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("delete-account: auth user", authError.message);
      return Response.json({ error: "delete_failed" }, { status: 500 });
    }

    const appStoreSubscriptionActive = !!sub &&
      (sub.app_store_status === "active" || sub.app_store_status === "grace") &&
      sub.app_store_auto_renew === true;

    return Response.json({ ok: true, appleRevoked, appStoreSubscriptionActive });
  }),
};
