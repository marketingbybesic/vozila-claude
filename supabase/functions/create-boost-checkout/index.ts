// POST /functions/v1/create-boost-checkout
// Body: { listingId: string, tier: 'top-2d' | 'featured-7d' | 'premium-30d' }
// Auth: requires user JWT in Authorization header.
//
// Validates the user owns the listing, then creates a Stripe Checkout session
// in payment mode (one-shot). On success, the stripe-webhook function will
// flip listings.is_featured = true and set featured_until.

import { preflight, json } from "../_shared/cors.ts";
import { stripe, isValidBoostTier } from "../_shared/stripe.ts";
import { supabaseAsUser } from "../_shared/supabase.ts";

const TIER_PRICE_ENV: Record<string, string> = {
  "top-2d": "STRIPE_PRICE_BOOST_TOP",
  "featured-7d": "STRIPE_PRICE_BOOST_FEATURED",
  "premium-30d": "STRIPE_PRICE_BOOST_PREMIUM",
};

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { listingId?: string; tier?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const { listingId, tier } = body;
  if (!listingId || !tier) return json({ error: "listingId and tier required" }, 400);
  if (!isValidBoostTier(tier)) return json({ error: "Invalid tier" }, 400);

  const priceId = Deno.env.get(TIER_PRICE_ENV[tier]);
  if (!priceId) return json({ error: `Stripe price not configured for ${tier}` }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  // Verify ownership.
  const { data: listing, error: listErr } = await supabase
    .from("listings")
    .select("id, user_id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (listErr) return json({ error: listErr.message }, 500);
  if (!listing) return json({ error: "Listing not found" }, 404);
  if (listing.user_id !== user.id) return json({ error: "Not your listing" }, 403);

  const origin = req.headers.get("Origin") ?? "https://testiranje.cloud";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/listing/${listingId}?boost=success`,
      cancel_url: `${origin}/listing/${listingId}?boost=cancel`,
      customer_email: user.email ?? undefined,
      metadata: {
        kind: "boost",
        listing_id: listingId,
        tier,
        user_id: user.id,
      },
      // VAT handled via Stripe Tax dashboard config.
      automatic_tax: { enabled: false },
    });
    return json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return json({ error: msg }, 500);
  }
});
