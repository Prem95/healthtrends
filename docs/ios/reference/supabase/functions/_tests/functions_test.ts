// End-to-end tests for the three Edge Functions with every outside party
// (Apple, Stripe, Supabase REST/Auth) replaced by an in-process fake.
//
//   cd supabase/functions && deno test --allow-env --allow-net _tests/functions_test.ts
//
// What this proves: request authentication, the App Store Server API token we
// mint, environment fallback, every verdict the app can receive, and exactly
// what is written to the database. What it cannot prove: Apple's real
// responses — that is the sandbox purchase test in docs/ios/12-qa.md.

import { assert, assertEquals } from "jsr:@std/assert@1";
import { exportJWK, exportPKCS8, generateKeyPair, jwtVerify, SignJWT } from "npm:jose@6";

const USER = "11111111-2222-4333-8444-555555555555";
const OTHER = "99999999-2222-4333-8444-555555555555";
const BUNDLE = "com.bbiom.app";
const MONTHLY = "com.bbiom.app.pro.monthly";

// --- keys -------------------------------------------------------------------
const appleKey = await generateKeyPair("ES256", { extractable: true });
const supabaseKey = await generateKeyPair("ES256", { extractable: true });
const supabaseJwk = { ...(await exportJWK(supabaseKey.publicKey)), kid: "test-key", alg: "ES256", use: "sig" };

Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
Deno.env.set("SUPABASE_SECRET_KEY", "sb_secret_test");
Deno.env.set("SUPABASE_JWKS", JSON.stringify({ keys: [supabaseJwk] }));
Deno.env.set("APPLE_IAP_ISSUER_ID", "issuer-uuid");
Deno.env.set("APPLE_IAP_KEY_ID", "KEYID12345");
Deno.env.set("APPLE_IAP_PRIVATE_KEY", (await exportPKCS8(appleKey.privateKey)).replace(/\n/g, "\\n"));
Deno.env.set("APP_BUNDLE_ID", BUNDLE);
Deno.env.set("IAP_PRODUCT_IDS", `${MONTHLY}, com.bbiom.app.pro.yearly`);
Deno.env.set("APPLE_TEAM_ID", "TEAM123456");
Deno.env.set("APPLE_SIWA_KEY_ID", "SIWAKEY123");
Deno.env.set("APPLE_SIWA_PRIVATE_KEY", await exportPKCS8(appleKey.privateKey));
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_x");

const iapConfirm = (await import("../iap-confirm/index.ts")).default.fetch;
const notifications = (await import("../app-store-notifications/index.ts")).default.fetch;
const deleteAccount = (await import("../delete-account/index.ts")).default.fetch;

// --- helpers ----------------------------------------------------------------
/** A JWS shaped like Apple's (the functions never trust its signature). */
const jws = (payload: Record<string, unknown>) =>
  new SignJWT(payload).setProtectedHeader({ alg: "ES256" }).sign(appleKey.privateKey);

const userJwt = (sub = USER) =>
  new SignJWT({ role: "authenticated", email: "a@test.local" })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setSubject(sub)
    .setAudience("authenticated")
    .setIssuer("http://localhost:54321/auth/v1")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(supabaseKey.privateKey);

const tx = (over: Record<string, unknown> = {}) => ({
  transactionId: "2000000000000100",
  originalTransactionId: "2000000000000001",
  bundleId: BUNDLE,
  productId: MONTHLY,
  type: "Auto-Renewable Subscription",
  environment: "Sandbox",
  appAccountToken: USER,
  expiresDate: Date.parse("2027-01-01T00:00:00Z"),
  ...over,
});

type Call = { method: string; url: string; body: string | null; headers: Headers };
type World = {
  calls: Call[];
  apple: {
    /** environment that knows the transaction; the other answers 404 */
    env: "Production" | "Sandbox";
    transaction: Record<string, unknown>;
    status: number;
    renewal: Record<string, unknown>;
    down: boolean;
  };
  rpcResult: { result: string; user_id: string | null };
  subscriptionRow: Record<string, unknown> | null;
};

function world(over: Partial<World["apple"]> = {}): World {
  return {
    calls: [],
    apple: { env: "Sandbox", transaction: tx(), status: 1, renewal: { autoRenewStatus: 1 }, down: false, ...over },
    rpcResult: { result: "applied", user_id: USER },
    subscriptionRow: null,
  };
}

/** Installs the fake network for one test and returns what was called. */
function install(w: World) {
  const real = globalThis.fetch;
  globalThis.fetch = async (input: Request | URL | string, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    const body = req.method === "GET" || req.method === "HEAD" ? null : await req.text();
    w.calls.push({ method: req.method, url: req.url, body, headers: req.headers });
    const j = (data: unknown, status = 200) => Response.json(data, { status });

    if (url.hostname.startsWith("api.storekit")) {
      // Our bearer token must be a valid App Store Server API token.
      const token = req.headers.get("authorization")!.replace("Bearer ", "");
      const { payload, protectedHeader } = await jwtVerify(token, appleKey.publicKey, {
        issuer: "issuer-uuid",
        audience: "appstoreconnect-v1",
      });
      assertEquals(protectedHeader.kid, "KEYID12345");
      assertEquals(payload.bid, BUNDLE);
      assert((payload.exp! - payload.iat!) <= 3600, "token lifetime within Apple's limit");

      if (w.apple.down) return j({ errorCode: 5000000, errorMessage: "down" }, 500);
      const env = url.hostname.includes("sandbox") ? "Sandbox" : "Production";
      if (env !== w.apple.env) return j({ errorCode: 4040010, errorMessage: "Transaction id not found." }, 404);
      if (url.pathname.startsWith("/inApps/v1/transactions/")) {
        return j({ signedTransactionInfo: await jws(w.apple.transaction) });
      }
      if (url.pathname.startsWith("/inApps/v1/subscriptions/")) {
        return j({
          environment: env,
          bundleId: w.apple.transaction.bundleId,
          data: [{
            subscriptionGroupIdentifier: "21000000",
            lastTransactions: [{
              status: w.apple.status,
              originalTransactionId: w.apple.transaction.originalTransactionId,
              signedTransactionInfo: await jws(w.apple.transaction),
              signedRenewalInfo: await jws(w.apple.renewal),
            }],
          }],
        });
      }
    }
    if (url.hostname === "localhost") {
      if (url.pathname === "/rest/v1/rpc/apply_app_store_subscription") return j(w.rpcResult);
      if (url.pathname === "/rest/v1/app_store_notifications") return new Response(null, { status: 201 });
      if (url.pathname === "/rest/v1/subscriptions" && req.method === "GET") return j(w.subscriptionRow);
      if (url.pathname.startsWith("/rest/v1/") && req.method === "DELETE") return new Response(null, { status: 204 });
      // supabase-js reads the user before deleting it.
      if (url.pathname.startsWith("/auth/v1/admin/users/") && req.method === "GET") return j({ id: USER, email: "a@test.local" });
      if (url.pathname.startsWith("/auth/v1/admin/users/") && req.method === "DELETE") return j({});
    }
    if (url.hostname === "appleid.apple.com") {
      return url.pathname === "/auth/token" ? j({ refresh_token: "r.token" }) : new Response(null, { status: 200 });
    }
    if (url.hostname === "api.stripe.com") return j({ id: "sub_1", status: "canceled" });
    throw new Error(`unexpected request in test: ${req.method} ${req.url}`);
  };
  return () => (globalThis.fetch = real);
}

async function confirm(w: World, opts: { auth?: boolean; productId?: string } = {}) {
  const restore = install(w);
  try {
    const headers: Record<string, string> = { "content-type": "application/json", apikey: "sb_publishable_test" };
    if (opts.auth !== false) headers.authorization = `Bearer ${await userJwt()}`;
    const res = await iapConfirm(
      new Request("http://localhost:54321/functions/v1/iap-confirm", {
        method: "POST",
        headers,
        body: JSON.stringify({
          store: "apple",
          purchaseToken: await jws(tx()),
          productId: opts.productId ?? MONTHLY,
        }),
      }),
    );
    return { status: res.status, body: await res.json() };
  } finally {
    restore();
  }
}

const rpcArgs = (w: World) =>
  JSON.parse(w.calls.find((c) => c.url.includes("/rpc/apply_app_store_subscription"))!.body!);

// --- iap-confirm --------------------------------------------------------------
Deno.test("iap-confirm: a real, active purchase is entitled and recorded for the caller", async () => {
  const w = world();
  const { status, body } = await confirm(w);
  assertEquals(status, 200);
  assertEquals(body, { status: "entitled", alreadyGranted: false });
  assertEquals(rpcArgs(w), {
    p_user_id: USER,
    p_app_account_token: USER,
    p_original_transaction_id: "2000000000000001",
    p_product_id: MONTHLY,
    p_status: "active",
    p_expires_at: "2027-01-01T00:00:00.000Z",
    p_auto_renew: true,
    p_environment: "Sandbox",
  });
  const rpc = w.calls.find((c) => c.url.includes("/rpc/"))!;
  assertEquals(rpc.headers.get("apikey"), "sb_secret_test", "database write uses the secret key");
});

Deno.test("iap-confirm: rejects a caller without a session", async () => {
  const w = world();
  const { status } = await confirm(w, { auth: false });
  assertEquals(status, 401);
  assertEquals(w.calls.length, 0, "nothing was asked of Apple or the database");
});

Deno.test("iap-confirm: falls back to the other Apple environment", async () => {
  const w = world({ env: "Production", transaction: tx({ environment: "Production" }) });
  const { body } = await confirm(w); // the app's token claims Sandbox
  assertEquals(body.status, "entitled");
  assertEquals(rpcArgs(w).p_environment, "Production");
});

Deno.test("iap-confirm: a transaction from another app is invalid", async () => {
  const w = world({ transaction: tx({ bundleId: "com.someone.else" }) });
  const { body } = await confirm(w);
  assertEquals(body, { status: "invalid", reason: "wrong_app" });
  assert(!w.calls.some((c) => c.url.includes("/rpc/")), "nothing written");
});

Deno.test("iap-confirm: the product Apple reports must be the one the app expected", async () => {
  const w = world();
  const { body } = await confirm(w, { productId: "com.bbiom.app.pro.yearly" });
  assertEquals(body, { status: "invalid", reason: "product_mismatch" });
});

Deno.test("iap-confirm: a subscription owned by another account is a conflict", async () => {
  const w = world({ transaction: tx({ appAccountToken: OTHER }) });
  w.rpcResult = { result: "conflict", user_id: OTHER };
  const { body } = await confirm(w);
  assertEquals(body, { status: "ownership_conflict", alreadyGranted: true });
  assertEquals(rpcArgs(w).p_app_account_token, OTHER);
});

Deno.test("iap-confirm: an expired subscription is not entitled, but is recorded", async () => {
  const w = world({ status: 2, renewal: { autoRenewStatus: 0 } });
  const { body } = await confirm(w);
  assertEquals(body, { status: "invalid", reason: "expired" });
  assertEquals(rpcArgs(w).p_status, "expired");
  assertEquals(rpcArgs(w).p_auto_renew, false);
});

Deno.test("iap-confirm: billing grace period keeps access until the grace date", async () => {
  const grace = Date.parse("2027-01-17T00:00:00Z");
  const w = world({ status: 4, renewal: { autoRenewStatus: 1, gracePeriodExpiresDate: grace } });
  const { body } = await confirm(w);
  assertEquals(body.status, "entitled");
  assertEquals(rpcArgs(w).p_status, "grace");
  assertEquals(rpcArgs(w).p_expires_at, "2027-01-17T00:00:00.000Z");
});

Deno.test("iap-confirm: when Apple is unreachable the purchase is delayed, never rejected", async () => {
  const w = world({ down: true });
  const { status, body } = await confirm(w);
  assertEquals(status, 200);
  assertEquals(body.status, "verification_delayed");
});

Deno.test("iap-confirm: an id Apple has never seen is invalid", async () => {
  const w = world({ env: "Production" });
  w.apple.env = "Nowhere" as never;
  const { body } = await confirm(w);
  assertEquals(body, { status: "invalid", reason: "not_found" });
});

// --- app-store-notifications ----------------------------------------------------
async function notify(w: World, payload: Record<string, unknown>) {
  const restore = install(w);
  try {
    const res = await notifications(
      new Request("http://localhost:54321/functions/v1/app-store-notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedPayload: await jws(payload) }),
      }),
    );
    return { status: res.status, text: await res.text() };
  } finally {
    restore();
  }
}

const notification = async (over: Record<string, unknown> = {}, data: Record<string, unknown> = {}) => ({
  notificationType: "DID_RENEW",
  notificationUUID: "7c1b6b1e-0000-4000-8000-000000000001",
  version: "2.0",
  data: { bundleId: BUNDLE, environment: "Sandbox", signedTransactionInfo: await jws(tx()), ...data },
  ...over,
});

Deno.test("notifications: re-reads the subscription from Apple and stores that, with no caller", async () => {
  const w = world({ status: 3, renewal: { autoRenewStatus: 1 } });
  const { status } = await notify(w, await notification({ notificationType: "DID_FAIL_TO_RENEW" }));
  assertEquals(status, 200);
  assertEquals(rpcArgs(w).p_user_id, null);
  assertEquals(rpcArgs(w).p_status, "billing_retry", "state comes from Apple's API, not the notification");
  const ledger = w.calls.find((c) => c.url.includes("/rest/v1/app_store_notifications"))!;
  assertEquals(JSON.parse(ledger.body!).notification_type, "DID_FAIL_TO_RENEW");
});

Deno.test("notifications: another app's notification is acknowledged and ignored", async () => {
  const w = world();
  const { status } = await notify(w, await notification({}, { bundleId: "com.someone.else" }));
  assertEquals(status, 200);
  assertEquals(w.calls.length, 0);
});

Deno.test("notifications: a TEST notification without a transaction is acknowledged", async () => {
  const w = world();
  const { status } = await notify(w, { notificationType: "TEST", notificationUUID: "u-1", data: { bundleId: BUNDLE } });
  assertEquals(status, 200);
  assertEquals(w.calls.length, 0);
});

Deno.test("notifications: asks Apple to retry when the state cannot be read", async () => {
  const w = world({ down: true });
  const { status } = await notify(w, await notification());
  assertEquals(status, 503);
});

Deno.test("notifications: garbage is rejected", async () => {
  const restore = install(world());
  try {
    const res = await notifications(
      new Request("http://localhost:54321/functions/v1/app-store-notifications", {
        method: "POST",
        body: JSON.stringify({ signedPayload: "not-a-jws" }),
      }),
    );
    assertEquals(res.status, 400);
  } finally {
    restore();
  }
});

// --- delete-account -------------------------------------------------------------
async function del(w: World, body: Record<string, unknown>) {
  const restore = install(w);
  try {
    const res = await deleteAccount(
      new Request("http://localhost:54321/functions/v1/delete-account", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await userJwt()}` },
        body: JSON.stringify(body),
      }),
    );
    return { status: res.status, body: await res.json() };
  } finally {
    restore();
  }
}

Deno.test("delete-account: needs the typed confirmation", async () => {
  const w = world();
  const { status } = await del(w, { confirm: "delete" });
  assertEquals(status, 400);
  assertEquals(w.calls.length, 0);
});

Deno.test("delete-account: cancels Stripe, revokes Apple, deletes rows, then the user", async () => {
  const w = world();
  w.subscriptionRow = {
    stripe_subscription_id: "sub_1",
    app_store_status: "active",
    app_store_expires_at: "2027-01-01T00:00:00Z",
    app_store_auto_renew: true,
  };
  const { status, body } = await del(w, { confirm: "DELETE", appleAuthorizationCode: "c.code" });
  assertEquals(status, 200);
  assertEquals(body, { ok: true, appleRevoked: true, appStoreSubscriptionActive: true });

  const seen = w.calls.map((c) => `${c.method} ${new URL(c.url).host}${new URL(c.url).pathname}`);
  assert(seen.includes("DELETE api.stripe.com/v1/subscriptions/sub_1"));
  assert(seen.includes("POST appleid.apple.com/auth/token"));
  assert(seen.includes("POST appleid.apple.com/auth/revoke"));
  for (const t of ["profiles", "biomarkers", "unit_preferences", "subscriptions"]) {
    const c = w.calls.find((x) => x.method === "DELETE" && x.url.includes(`/rest/v1/${t}?`))!;
    assert(c.url.includes(`user_id=eq.${USER}`), `${t} delete is scoped to the caller`);
  }
  assert(seen.includes(`DELETE localhost:54321/auth/v1/admin/users/${USER}`));
  // The auth user is removed last.
  assertEquals(seen[seen.length - 1], `DELETE localhost:54321/auth/v1/admin/users/${USER}`);

  const revoke = w.calls.find((c) => c.url.endsWith("/auth/revoke"))!;
  const form = new URLSearchParams(revoke.body!);
  assertEquals(form.get("client_id"), BUNDLE);
  assertEquals(form.get("token"), "r.token");
  const { payload } = await jwtVerify(form.get("client_secret")!, appleKey.publicKey, {
    issuer: "TEAM123456",
    audience: "https://appleid.apple.com",
    subject: BUNDLE,
  });
  assert(payload.exp! > Date.now() / 1000);
});
