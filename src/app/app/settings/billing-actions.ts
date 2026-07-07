"use server";

import { redirect } from "next/navigation";
import { getStripe, PRICE_IDS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/data";
import { getBaseUrl } from "@/lib/base-url";

/**
 * Create a Stripe Checkout session for Pro (monthly or yearly) and redirect.
 * client_reference_id carries our user id; a stored stripe_customer_id is
 * reused so one user never spawns multiple Stripe customers.
 */
export async function startCheckout(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login?next=/app/settings");

  const interval = formData.get("interval") === "yearly" ? "yearly" : "monthly";
  const price = interval === "yearly" ? PRICE_IDS.yearly() : PRICE_IDS.monthly();
  if (!price) redirect("/app/settings?error=billing_unconfigured");

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  const base = await getBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    ...(sub?.stripe_customer_id
      ? { customer: sub.stripe_customer_id }
      : { customer_email: user.email ?? undefined }),
    success_url: `${base}/app/settings?upgraded=1`,
    cancel_url: `${base}/app/settings`,
    allow_promotion_codes: true,
  });

  if (!session.url) redirect("/app/settings?error=billing");
  redirect(session.url);
}

/** Send the user to the Stripe Billing Portal (manage / cancel / card). */
export async function openBillingPortal(): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login?next=/app/settings");

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) redirect("/app/settings?error=no_customer");

  const stripe = getStripe();
  const base = await getBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${base}/app/settings`,
  });
  redirect(portal.url);
}
