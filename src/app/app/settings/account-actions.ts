"use server";

import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/data";

/**
 * Self-serve account deletion (health-data ownership requirement):
 *   1. delete all user rows — profiles cascade to sessions → results,
 *      life events, watched markers; custom biomarkers; subscription row
 *   2. cancel any active Stripe subscription
 *   3. delete the auth user via the admin API (service role)
 * The user must type DELETE to confirm. After deletion the same email can
 * sign up fresh with zero residual data.
 */
export async function deleteAccount(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");

  if (formData.get("confirm") !== "DELETE") {
    redirect("/app/settings?error=confirm_delete");
  }

  const admin = createAdminClient();

  // 2 (first, so a failure here doesn't leave a paying ghost): cancel Stripe.
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (sub?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
    } catch {
      // Already canceled / missing in Stripe — data deletion proceeds regardless.
    }
  }

  // 1: delete all user rows. profiles/biomarkers/subscriptions FK-cascade the rest.
  await admin.from("profiles").delete().eq("user_id", user.id);
  await admin.from("biomarkers").delete().eq("user_id", user.id);
  await admin.from("subscriptions").delete().eq("user_id", user.id);

  // 3: delete the auth user itself.
  await admin.auth.admin.deleteUser(user.id);

  // Clear the local session cookie.
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/?deleted=1");
}
