// POST /functions/v1/iap-confirm            (signed-in user)
//
// The app sends the store's signed transaction after a purchase or a restore.
// We ask Apple what that transaction really is, check it belongs to this
// account, record the subscription, and answer with the verdict the app's
// purchase flow understands (expo-iap `PurchaseConfirmation`):
//   entitled | ownership_conflict | invalid | verification_delayed
// The app finishes the StoreKit transaction only after `entitled`.

import { withSupabase } from "npm:@supabase/server@1";
import {
  AppleApiError,
  type AppleTransaction,
  getSubscriptionState,
  getTransaction,
  isEntitled,
  loadAppleConfig,
  peek,
} from "../_shared/apple.ts";

type Verdict =
  | { status: "entitled"; alreadyGranted: boolean }
  | { status: "ownership_conflict"; alreadyGranted: boolean }
  | { status: "invalid"; reason?: string }
  | { status: "verification_delayed"; retryAfterMs: number };

const json = (body: Verdict | { error: string }, status = 200) => Response.json(body, { status });

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    const userId = ctx.userClaims?.id;
    if (!userId) return json({ error: "unauthorized" }, 401);

    let body: { store?: string; purchaseToken?: string; productId?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    if (body.store !== "apple" || typeof body.purchaseToken !== "string" || body.purchaseToken.length > 20_000) {
      return json({ error: "invalid_request" }, 400);
    }

    const cfg = loadAppleConfig();

    // Read the id out of what the app sent; believe nothing else in it.
    const claimed = peek<AppleTransaction>(body.purchaseToken);
    if (!claimed?.transactionId) return json({ status: "invalid", reason: "unreadable" });

    try {
      const { transaction, env } = await getTransaction(cfg, String(claimed.transactionId), claimed.environment);

      if (transaction.bundleId !== cfg.bundleId) return json({ status: "invalid", reason: "wrong_app" });
      if (!cfg.productIds.includes(transaction.productId)) return json({ status: "invalid", reason: "unknown_product" });
      if (body.productId && body.productId !== transaction.productId) {
        return json({ status: "invalid", reason: "product_mismatch" });
      }

      const state = await getSubscriptionState(cfg, transaction.originalTransactionId, env);
      if (!state) return json({ status: "invalid", reason: "no_subscription" });

      const { data, error } = await ctx.supabaseAdmin.rpc("apply_app_store_subscription", {
        p_user_id: userId,
        p_app_account_token: state.appAccountToken,
        p_original_transaction_id: state.originalTransactionId,
        p_product_id: state.productId,
        p_status: state.status,
        p_expires_at: state.expiresAt,
        p_auto_renew: state.autoRenew,
        p_environment: state.environment,
      });
      if (error) {
        console.error("apply_app_store_subscription failed", error.message);
        return json({ status: "verification_delayed", retryAfterMs: 15_000 });
      }

      const result = (data as { result: string }).result;
      if (result === "conflict") {
        // The subscription is real and already unlocks another bbiom account.
        return json({ status: "ownership_conflict", alreadyGranted: isEntitled(state) });
      }
      if (!isEntitled(state)) return json({ status: "invalid", reason: state.status });
      return json({ status: "entitled", alreadyGranted: false });
    } catch (e) {
      if (e instanceof AppleApiError && e.notFound) return json({ status: "invalid", reason: "not_found" });
      // Apple unreachable, rate-limited, or our key is misconfigured: do not
      // reject a purchase the user may have paid for. The app retries.
      console.error("iap-confirm could not verify", e instanceof Error ? e.message : e);
      return json({ status: "verification_delayed", retryAfterMs: 30_000 });
    }
  }),
};
