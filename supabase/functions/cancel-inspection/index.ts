// POST /functions/v1/cancel-inspection
// Body: { booking_id: string }
// Auth: user JWT.
//
// Cancels a buyer's inspection booking. State machine:
//   pending          → 'canceled'                       (no refund — never charged)
//   paid             → 'canceled' + Stripe refund       (full 100 EUR back)
//   assigned         → 'canceled' + Stripe refund       (admin can override later if inspector already drove out)
//   completed        → reject — too late to cancel
//   canceled         → noop (already canceled)
//
// Refunds use the stored stripe_session_id to find the PaymentIntent then
// refund full amount. Failures bubble back to the buyer with the Stripe error.

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  const { data: booking, error: bookErr } = await supabase
    .from("inspection_bookings")
    .select("id, user_id, status, stripe_session_id, paid_eur")
    .eq("id", body.booking_id)
    .maybeSingle();
  if (bookErr) return json({ error: bookErr.message }, 500);
  if (!booking) return json({ error: "Not found" }, 404);
  if (booking.user_id !== user.id) return json({ error: "Forbidden" }, 403);

  if (booking.status === "completed") {
    return json({ error: "Inspekcija je već obavljena — ne može se otkazati." }, 400);
  }
  if (booking.status === "canceled") {
    return json({ ok: true, refunded: false, note: "already_canceled" });
  }

  const refundEligible = booking.status === "paid" || booking.status === "assigned";

  let refundId: string | null = null;
  if (refundEligible && booking.stripe_session_id) {
    try {
      // Find the PaymentIntent on the Checkout Session, then refund.
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id, {
        expand: ["payment_intent"],
      });
      const piId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
      if (!piId) {
        return json({ error: "Plaćanje nije pronađeno za povrat." }, 500);
      }
      const refund = await stripe.refunds.create({
        payment_intent: piId,
        reason: "requested_by_customer",
      });
      refundId = refund.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "refund failed";
      return json({ error: `Stripe povrat nije uspio: ${msg}` }, 500);
    }
  }

  // Flip status. Service role used so RLS update-self policy doesn't have to
  // handle the inspector_id null-out edge.
  const { error: updErr } = await supabaseAdmin
    .from("inspection_bookings")
    .update({
      status: "canceled",
      inspector_id: null,
    })
    .eq("id", booking.id);
  if (updErr) {
    return json({ error: updErr.message, refund_id: refundId }, 500);
  }

  // Drop a notification row for the bell.
  await supabaseAdmin.from("notifications").insert({
    user_id: user.id,
    type: "inspection_canceled",
    payload: {
      booking_id: booking.id,
      refunded: refundEligible,
      refund_id: refundId,
      paid_eur: booking.paid_eur,
    },
  });

  return json({ ok: true, refunded: refundEligible, refund_id: refundId });
});
