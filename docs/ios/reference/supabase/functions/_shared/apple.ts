// Apple server-to-server helpers shared by the Edge Functions.
//
// Trust model: nothing a client or a webhook sends is believed. A signed
// transaction (JWS) from the app, or a notification body, is only *read* to
// find the transaction id. The facts — product, expiry, status, who bought it —
// are then fetched from the App Store Server API over TLS, authenticated with
// our own key. A forged or replayed input can therefore do nothing except
// trigger a re-sync of a real transaction.

import { decodeJwt, importPKCS8, SignJWT } from "npm:jose@6";

export type AppleEnvironment = "Production" | "Sandbox";

const HOSTS: Record<AppleEnvironment, string> = {
  Production: "https://api.storekit.itunes.apple.com",
  Sandbox: "https://api.storekit-sandbox.itunes.apple.com",
};

export type AppleConfig = {
  issuerId: string;
  keyId: string;
  privateKeyPem: string;
  bundleId: string;
  productIds: string[];
};

/** Reads the App Store configuration from the function's secrets. */
export function loadAppleConfig(): AppleConfig {
  const need = (name: string) => {
    const v = Deno.env.get(name);
    if (!v) throw new Error(`Missing secret ${name}`);
    return v;
  };
  return {
    issuerId: need("APPLE_IAP_ISSUER_ID"),
    keyId: need("APPLE_IAP_KEY_ID"),
    // Secrets are often stored on one line with literal "\n".
    privateKeyPem: need("APPLE_IAP_PRIVATE_KEY").replace(/\\n/g, "\n"),
    bundleId: need("APP_BUNDLE_ID"),
    productIds: need("IAP_PRODUCT_IDS").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

/** The fields we use from Apple's JWSTransactionDecodedPayload. */
export type AppleTransaction = {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  type?: string;
  environment?: AppleEnvironment;
  appAccountToken?: string;
  expiresDate?: number;
  revocationDate?: number;
};

/** The fields we use from Apple's JWSRenewalInfoDecodedPayload. */
export type AppleRenewalInfo = {
  autoRenewStatus?: number;
  gracePeriodExpiresDate?: number;
  autoRenewProductId?: string;
};

export type OurStatus = "active" | "grace" | "billing_retry" | "expired" | "revoked";

export type SubscriptionState = {
  originalTransactionId: string;
  productId: string;
  status: OurStatus;
  expiresAt: string | null;
  autoRenew: boolean;
  environment: AppleEnvironment;
  appAccountToken: string | null;
};

/** Decodes a compact JWS payload WITHOUT verifying it. Use only to find ids. */
export function peek<T>(jws: string): T | null {
  try {
    return decodeJwt(jws) as T;
  } catch {
    return null;
  }
}

export class AppleApiError extends Error {
  constructor(public status: number, public errorCode: number | null, message: string) {
    super(message);
  }
  /** Apple says this id does not exist in this environment. */
  get notFound() {
    return this.status === 404;
  }
}

async function bearer(cfg: AppleConfig): Promise<string> {
  const key = await importPKCS8(cfg.privateKeyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ bid: cfg.bundleId })
    .setProtectedHeader({ alg: "ES256", kid: cfg.keyId, typ: "JWT" })
    .setIssuer(cfg.issuerId)
    .setAudience("appstoreconnect-v1")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}

async function call<T>(cfg: AppleConfig, env: AppleEnvironment, path: string): Promise<T> {
  const res = await fetch(`${HOSTS[env]}${path}`, {
    headers: { Authorization: `Bearer ${await bearer(cfg)}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    let errorCode: number | null = null;
    let message = `App Store Server API ${res.status}`;
    try {
      const body = await res.json();
      errorCode = typeof body?.errorCode === "number" ? body.errorCode : null;
      if (body?.errorMessage) message = `${message}: ${body.errorMessage}`;
    } catch { /* no body */ }
    throw new AppleApiError(res.status, errorCode, message);
  }
  return (await res.json()) as T;
}

/** Tries the hinted environment first, then the other one. */
async function inEither<T>(
  hint: AppleEnvironment | undefined,
  fn: (env: AppleEnvironment) => Promise<T>,
): Promise<{ value: T; env: AppleEnvironment }> {
  const order: AppleEnvironment[] = hint === "Sandbox" ? ["Sandbox", "Production"] : ["Production", "Sandbox"];
  let last: unknown;
  for (const env of order) {
    try {
      return { value: await fn(env), env };
    } catch (e) {
      last = e;
      if (!(e instanceof AppleApiError) || !e.notFound) throw e;
    }
  }
  throw last;
}

/** Apple's own record of one transaction. */
export async function getTransaction(
  cfg: AppleConfig,
  transactionId: string,
  hint?: AppleEnvironment,
): Promise<{ transaction: AppleTransaction; env: AppleEnvironment }> {
  const { value, env } = await inEither(hint, (e) =>
    call<{ signedTransactionInfo: string }>(cfg, e, `/inApps/v1/transactions/${encodeURIComponent(transactionId)}`));
  const transaction = peek<AppleTransaction>(value.signedTransactionInfo);
  if (!transaction) throw new Error("Apple returned an unreadable transaction");
  return { transaction, env };
}

type StatusResponse = {
  bundleId: string;
  data: {
    lastTransactions: {
      status: number;
      originalTransactionId: string;
      signedTransactionInfo: string;
      signedRenewalInfo: string;
    }[];
  }[];
};

const STATUS: Record<number, OurStatus> = {
  1: "active",
  2: "expired",
  3: "billing_retry",
  4: "grace",
  5: "revoked",
};

/** The current state of the subscription that `originalTransactionId` belongs to. */
export async function getSubscriptionState(
  cfg: AppleConfig,
  originalTransactionId: string,
  hint?: AppleEnvironment,
): Promise<SubscriptionState | null> {
  const { value, env } = await inEither(hint, (e) =>
    call<StatusResponse>(cfg, e, `/inApps/v1/subscriptions/${encodeURIComponent(originalTransactionId)}`));
  if (value.bundleId !== cfg.bundleId) return null;

  const items = value.data.flatMap((g) => g.lastTransactions);
  const item = items.find((t) => t.originalTransactionId === originalTransactionId) ?? items[0];
  if (!item) return null;

  const tx = peek<AppleTransaction>(item.signedTransactionInfo);
  const renewal = peek<AppleRenewalInfo>(item.signedRenewalInfo) ?? {};
  if (!tx || tx.bundleId !== cfg.bundleId || !cfg.productIds.includes(tx.productId)) return null;

  const status = STATUS[item.status] ?? "expired";
  // In a billing grace period access runs to the end of the grace period.
  const expiresMs = status === "grace" && renewal.gracePeriodExpiresDate
    ? renewal.gracePeriodExpiresDate
    : tx.expiresDate;

  return {
    originalTransactionId: item.originalTransactionId,
    productId: tx.productId,
    status,
    expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
    autoRenew: renewal.autoRenewStatus === 1,
    environment: env,
    appAccountToken: tx.appAccountToken ? tx.appAccountToken.toLowerCase() : null,
  };
}

/** True when this state should unlock Pro. */
export function isEntitled(state: SubscriptionState): boolean {
  return state.status === "active" || state.status === "grace";
}

// ---------------------------------------------------------------------------
// Sign in with Apple: token revocation, required when an account is deleted.
// ---------------------------------------------------------------------------

export type SiwaConfig = { teamId: string; keyId: string; privateKeyPem: string; clientId: string };

export function loadSiwaConfig(): SiwaConfig | null {
  const teamId = Deno.env.get("APPLE_TEAM_ID");
  const keyId = Deno.env.get("APPLE_SIWA_KEY_ID");
  const pem = Deno.env.get("APPLE_SIWA_PRIVATE_KEY");
  const clientId = Deno.env.get("APP_BUNDLE_ID");
  if (!teamId || !keyId || !pem || !clientId) return null;
  return { teamId, keyId, privateKeyPem: pem.replace(/\\n/g, "\n"), clientId };
}

async function siwaClientSecret(cfg: SiwaConfig): Promise<string> {
  const key = await importPKCS8(cfg.privateKeyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: cfg.keyId })
    .setIssuer(cfg.teamId)
    .setSubject(cfg.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}

/**
 * Exchanges a fresh authorization code for a refresh token and revokes it, so
 * the app disappears from the user's "Sign in with Apple" list. Returns false
 * (never throws) if Apple refuses: deletion of our data must not depend on it.
 */
export async function revokeSignInWithApple(cfg: SiwaConfig, authorizationCode: string): Promise<boolean> {
  try {
    const secret = await siwaClientSecret(cfg);
    const form = (o: Record<string, string>) => new URLSearchParams(o);
    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({
        client_id: cfg.clientId,
        client_secret: secret,
        code: authorizationCode,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenRes.ok) return false;
    const { refresh_token } = await tokenRes.json();
    if (!refresh_token) return false;
    const revokeRes = await fetch("https://appleid.apple.com/auth/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form({
        client_id: cfg.clientId,
        client_secret: secret,
        token: refresh_token,
        token_type_hint: "refresh_token",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return revokeRes.ok;
  } catch {
    return false;
  }
}
