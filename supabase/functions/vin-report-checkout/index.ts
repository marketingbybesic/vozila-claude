// POST /functions/v1/vin-report-checkout
// Body: { listing_id: string, vin: string }
// Auth: user JWT.
//
// Creates a Stripe Checkout (one-shot, 9.99 EUR) for a VIN history report.
// Pre-creates a vin_reports row in pending status so the webhook can
// flip it to 'paid' on completion. Buyer gets the report URL by email
// once the report-generator cron runs.

import { preflight, json } from "../_shared/cors.ts";
import { stripe } from "../_shared/stripe.ts";
import { supabaseAsUser, supabaseAdmin } from "../_shared/supabase.ts";

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { listing_id?: string; vin?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const vin = body.vin?.trim().toUpperCase() ?? "";
  if (!VIN_REGEX.test(vin)) return json({ error: "Neispravan VIN." }, 400);

  const priceId = Deno.env.get("STRIPE_PRICE_VIN_REPORT");
  if (!priceId) return json({ error: "VIN report price not configured." }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  // Pre-create report row so the webhook can match by stripe_session_id.
  const { data: report, error: insErr } = await supabaseAdmin
    .from("vin_reports")
    .insert({
      user_id: user.id,
      vin,
      listing_id: body.listing_id ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr) return json({ error: insErr.message }, 500);

  const origin = req.headers.get("Origin") ?? "https://testiranje.cloud";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      success_url: `${origin}/postavke?vin=success`,
      cancel_url: `${origin}/listing/${body.listing_id ?? ""}?vin=cancel`,
      metadata: {
        kind: "vin_report",
        report_id: report.id,
        user_id: user.id,
        vin,
      },
    });

    // Save the session id so webhook can match.
    await supabaseAdmin
      .from("vin_reports")
      .update({ stripe_session_id: session.id })
      .eq("id", report.id);

    return json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return json({ error: msg }, 500);
  }
});
