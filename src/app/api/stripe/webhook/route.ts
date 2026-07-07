import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook — signature-verified and idempotent by event ID.
 * Handled events:
 *   checkout.session.completed        → upsert subscription row, plan=pro
 *   customer.subscription.updated     → sync status + current_period_end
 *   customer.subscription.deleted     → downgrade to free
 *   invoice.payment_failed            → status=past_due (banner; access kept
 *                                       until period end)
 * All writes use the service-role client (RLS: users can only SELECT own row).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await request.text(); // raw body required for verification
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: record the event ID first; a duplicate insert means we've
  // already processed this event and can ack immediately.
  const { error: dupErr } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (dupErr) {
    if (dupErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: "ledger write failed" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!userId) break;

        let periodEnd: string | null = null;
        let status = "active";
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = sub.status;
          const end = sub.items.data[0]?.current_period_end;
          periodEnd = end ? new Date(end * 1000).toISOString() : null;
        }

        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            plan: "pro",
            status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const end = sub.items.data[0]?.current_period_end;
        const periodEnd = end ? new Date(end * 1000).toISOString() : null;
        const deleted = event.type === "customer.subscription.deleted";
        const expired = deleted || sub.status === "canceled" || sub.status === "unpaid";

        // Downgrade to free on cancel/expiry; keep data (read-only over limits).
        await admin
          .from("subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            plan: expired ? "free" : "pro",
            status: deleted ? "canceled" : sub.status,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;
        // Show the past_due banner but keep access until the period end.
        await admin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        // Unhandled event types are acked (and logged in stripe_events).
        break;
    }
  } catch {
    // Remove the ledger entry so Stripe's retry can reprocess this event.
    await admin.from("stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
