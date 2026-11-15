// POST /functions/v1/app-store-notifications      (called by Apple, no auth)
//
// App Store Server Notifications V2. Apple tells us a subscription changed
// (renewed, expired, refunded, entered billing retry, ...). The body is used
// only as a hint: we read the transaction id from it, then fetch the current
// state from the App Store Server API and store that. A forged body can only
// make us re-read a real subscription from Apple.
//
// config.toml: [functions.app-store-notifications] verify_jwt = false

import { withSupabase } from "npm:@supabase/server@1";
import {
  type AppleEnvironment,
  type AppleTransaction,
  getSubscriptionState,
  loadAppleConfig,
  peek,
} from "../_shared/apple.ts";

type NotificationPayload = {
  notificationType?: string;
  subtype?: string;
  notificationUUID?: string;
  data?: { bundleId?: string; environment?: AppleEnvironment; signedTransactionInfo?: string };
};

const ok = (note: string) => Response.json({ received: true, note });

export default {
  fetch: withSupabase({ auth: "none", cors: false }, async (req, ctx) => {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

    let signedPayload: unknown;
    try {
      signedPayload = (await req.json())?.signedPayload;
    } catch {
      return new Response("bad request", { status: 400 });
    }
    if (typeof signedPayload !== "string" || signedPayload.length > 100_000) {
      return new Response("bad request", { status: 400 });
    }

    const payload = peek<NotificationPayload>(signedPayload);
    if (!payload?.notificationType || !payload.notificationUUID) return new Response("bad request", { status: 400 });

    const cfg = loadAppleConfig();
    // Answer 200 to anything that is not ours or carries no transaction (TEST),
    // so Apple does not keep retrying it.
    if (payload.data?.bundleId && payload.data.bundleId !== cfg.bundleId) return ok("other app");
    const hinted = payload.data?.signedTransactionInfo
      ? peek<AppleTransaction>(payload.data.signedTransactionInfo)
      : null;
    if (!hinted?.originalTransactionId) return ok("no transaction");

    try {
      const state = await getSubscriptionState(
        cfg,
        String(hinted.originalTransactionId),
        payload.data?.environment ?? hinted.environment,
      );
      if (!state) return ok("not a known subscription");

      const { data, error } = await ctx.supabaseAdmin.rpc("apply_app_store_subscription", {
        p_user_id: null,
        p_app_account_token: state.appAccountToken,
        p_original_transaction_id: state.originalTransactionId,
        p_product_id: state.productId,
        p_status: state.status,
        p_expires_at: state.expiresAt,
        p_auto_renew: state.autoRenew,
        p_environment: state.environment,
      });
      if (error) throw new Error(error.message);

      // Audit trail; a repeated notificationUUID is simply ignored.
      await ctx.supabaseAdmin.from("app_store_notifications").upsert(
        {
          id: payload.notificationUUID,
          notification_type: payload.notificationType,
          subtype: payload.subtype ?? null,
          original_transaction_id: state.originalTransactionId,
          environment: state.environment,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      return ok((data as { result: string }).result);
    } catch (e) {
      // A non-2xx answer makes Apple retry later, which is what we want when
      // Apple's API or our database was briefly unavailable.
      console.error("app-store-notifications failed", e instanceof Error ? e.message : e);
      return new Response("temporarily unavailable", { status: 503 });
    }
  }),
};
