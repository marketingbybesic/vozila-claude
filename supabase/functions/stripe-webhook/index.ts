// POST /functions/v1/stripe-webhook
// No JWT — verified via Stripe-Signature header.
// Handles: checkout.session.completed (boost), customer.subscription.* (later).

import { stripe, BOOST_DURATION_DAYS, type BoostTierId } from "../_shared/stripe.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bad signature";
    return new Response(`Webhook signature failed: ${msg}`, { status: 400 });
  }

  // Idempotency dedupe.
  const { data: dup } = await supabaseAdmin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (dup) return new Response("ok (duplicate)", { status: 200 });

  await supabaseAdmin.from("stripe_events").insert({
    id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          id: string;
          metadata?: Record<string, string>;
        };
        const meta = session.metadata ?? {};
        if (meta.kind === "boost") {
          const tier = meta.tier as BoostTierId;
          const listingId = meta.listing_id;
          const days = BOOST_DURATION_DAYS[tier];
          if (!listingId || !days) break;
          const featuredUntil = new Date(Date.now() + days * 86_400_000).toISOString();
          await supabaseAdmin
            .from("listings")
            .update({
              is_featured: true,
              featured_tier: tier,
              featured_until: featuredUntil,
            })
            .eq("id", listingId);
        }
        // 'subscription' kind handled in next phase.
        break;
      }
      // customer.subscription.created/updated/deleted — phase 9.3.
      default:
        // ignore for now
        break;
    }
  } catch (e) {
    console.error("webhook handler error", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
