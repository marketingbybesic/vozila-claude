// POST /functions/v1/stripe-webhook
// No JWT — verified via Stripe-Signature header.
// Handles:
//   - checkout.session.completed (boost: flip is_featured / sub: stash customer id)
//   - customer.subscription.created
//   - customer.subscription.updated
//   - customer.subscription.deleted
//   - invoice.payment_failed (mark past_due)

import {
  stripe,
  BOOST_DURATION_DAYS,
  priceIdToSubTier,
  type BoostTierId,
  type SubTierId,
} from "../_shared/stripe.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
  metadata?: Record<string, string>;
  items: { data: { price: { id: string } }[] };
}

async function applySubscription(sub: StripeSubscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) {
    console.warn("subscription event without user_id metadata", sub.id);
    return;
  }
  const priceId = sub.items?.data?.[0]?.price?.id;
  const tier: SubTierId | null = priceId ? priceIdToSubTier(priceId) : null;
  const renewsAt = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: sub.customer,
      subscription_tier: tier,
      subscription_status: sub.status,
      subscription_renews_at: renewsAt,
    })
    .eq("id", userId);
}

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
          customer?: string | null;
          subscription?: string | null;
          metadata?: Record<string, string>;
          client_reference_id?: string | null;
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
        } else if (meta.kind === "subscription") {
          // Stash stripe_customer_id immediately so Customer Portal works
          // even before customer.subscription.created arrives.
          const userId = meta.user_id ?? session.client_reference_id ?? null;
          if (userId && session.customer) {
            await supabaseAdmin
              .from("profiles")
              .update({ stripe_customer_id: session.customer })
              .eq("id", userId);
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await applySubscription(event.data.object as unknown as StripeSubscription);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as StripeSubscription;
        const userId = sub.metadata?.user_id;
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_tier: null,
              subscription_status: "canceled",
              subscription_renews_at: null,
            })
            .eq("id", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as { customer?: string };
        if (inv.customer) {
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", inv.customer);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("webhook handler error", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
