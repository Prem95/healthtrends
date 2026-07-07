import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazily constructed Stripe client (server-only). */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const PRICE_IDS = {
  monthly: () => process.env.STRIPE_PRICE_PRO_MONTHLY,
  yearly: () => process.env.STRIPE_PRICE_PRO_YEARLY,
};
