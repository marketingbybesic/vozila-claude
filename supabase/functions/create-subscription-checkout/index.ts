// POST /functions/v1/create-subscription-checkout
// Body: { tier: 'bronze' | 'silver' | 'gold' }
// Auth: requires user JWT.
//
// Creates a Stripe Checkout in mode=subscription for the selected dealer tier.
// On success, the stripe-webhook handles customer.subscription.created and
// upserts profiles.subscription_tier + subscription_status + subscription_renews_at.
// We also stash stripe_customer_id on profiles so the Customer Portal works.

import { preflight, json } from "../_shared/cors.ts";
import { stripe, isValidSubTier, SUB_PRICE_ENV } from "../_shared/stripe.ts";
import { supabaseAsUser, supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { tier?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { tier } = body;
  if (!tier || !isValidSubTier(tier)) return json({ error: "Invalid tier" }, 400);

  const priceId = Deno.env.get(SUB_PRICE_ENV[tier]);
  if (!priceId) return json({ error: `Stripe sub price not configured for ${tier}` }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  // Reuse existing Stripe customer if profile already has one; otherwise let
  // Checkout create one and we'll store the id on the webhook.
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const origin = req.headers.get("Origin") ?? "https://testiranje.cloud";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/postavke?sub=success`,
      cancel_url: `${origin}/za-partnere?sub=cancel`,
      customer: prof?.stripe_customer_id ?? undefined,
      customer_email: prof?.stripe_customer_id ? undefined : (user.email ?? undefined),
      client_reference_id: user.id,
      metadata: {
        kind: "subscription",
        user_id: user.id,
        tier,
      },
      subscription_data: {
        metadata: { user_id: user.id, tier },
      },
      allow_promotion_codes: true,
    });
    return json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return json({ error: msg }, 500);
  }
});
