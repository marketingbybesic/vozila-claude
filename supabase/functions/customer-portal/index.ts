// POST /functions/v1/customer-portal
// Auth: user JWT.
// Returns a one-time Stripe Billing Portal URL so the user can manage their
// subscription (update card, cancel, view invoices) without us building UI.

import { preflight, json } from "../_shared/cors.ts";
import { stripe } from "../_shared/stripe.ts";
import { supabaseAsUser, supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof?.stripe_customer_id) {
    return json({ error: "No active subscription on file." }, 400);
  }

  const origin = req.headers.get("Origin") ?? "https://testiranje.cloud";

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: prof.stripe_customer_id,
      return_url: `${origin}/postavke`,
    });
    return json({ url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return json({ error: msg }, 500);
  }
});
