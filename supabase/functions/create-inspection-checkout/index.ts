// POST /functions/v1/create-inspection-checkout
// Body: { booking_id: string }
// Auth: user JWT.
//
// Validates the user owns the booking + it's still 'pending', then creates
// a Stripe Checkout (one-shot 100 EUR). Stripe webhook (extended in phase 11
// for kind=inspection) flips the booking to 'paid' on success.

import { preflight, json } from "../_shared/cors.ts";
import { stripe } from "../_shared/stripe.ts";
import { supabaseAsUser, supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { booking_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!body.booking_id) return json({ error: "booking_id required" }, 400);

  const priceId = Deno.env.get("STRIPE_PRICE_INSPECTION");
  if (!priceId) return json({ error: "Inspection price not configured." }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  // Validate ownership + state.
  const { data: booking, error: bookErr } = await supabase
    .from("inspection_bookings")
    .select("id, user_id, listing_id, status, address")
    .eq("id", body.booking_id)
    .maybeSingle();
  if (bookErr) return json({ error: bookErr.message }, 500);
  if (!booking) return json({ error: "Booking not found" }, 404);
  if (booking.user_id !== user.id) return json({ error: "Not your booking" }, 403);
  if (booking.status !== "pending") return json({ error: `Already ${booking.status}` }, 400);

  const origin = req.headers.get("Origin") ?? "https://testiranje.cloud";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      success_url: `${origin}/postavke?inspection=success`,
      cancel_url: `${origin}/listing/${booking.listing_id ?? ""}?inspection=cancel`,
      metadata: {
        kind: "inspection",
        booking_id: booking.id,
        user_id: user.id,
      },
    });

    // Save the session id so webhook can match (defensive — webhook actually
    // uses metadata.booking_id directly).
    await supabaseAdmin
      .from("inspection_bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);

    return json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return json({ error: msg }, 500);
  }
});
