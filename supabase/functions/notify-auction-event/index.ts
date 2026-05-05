// POST /functions/v1/notify-auction-event
// Body: { kind: 'outbid' | 'won' | 'settled', auction_id: string, payload?: any }
// Auth: user JWT (auction participant) OR service-role (cron-driven settlement).
//
// Routes auction events to the right Resend template + drops a notifications
// row for the bell. Idempotency is at the call-site (we send once per
// inserted row in DB), not in this fn.

import { sendEmail } from "../_shared/email.ts";
import { tplOutbid, tplWon, tplSellerSettled } from "../_shared/email-auctions.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface Body {
  kind: "outbid" | "won" | "settled";
  auction_id: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization") ?? "";
  const isServiceRole = auth === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`;
  if (!isServiceRole) {
    if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const { data, error } = await supabaseAdmin.auth.getUser(auth.slice("Bearer ".length));
    if (error || !data.user) return new Response("Unauthorized", { status: 401 });
  }

  let body: Body;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (!body.auction_id || !body.kind) return new Response("Missing fields", { status: 400 });

  const { data: auction } = await supabaseAdmin
    .from("auctions")
    .select("id, listing_id, seller_id, current_bid_eur, current_bidder, winner_id, status, buyer_premium_pct, end_at, reserve_eur, settled_at")
    .eq("id", body.auction_id)
    .maybeSingle();
  if (!auction) return new Response("Auction not found", { status: 404 });

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("title")
    .eq("id", auction.listing_id)
    .maybeSingle();
  const listingTitle = listing?.title ?? "Aukcija";

  const sentTo: string[] = [];

  // Helpers
  const profile = async (userId: string | null) => {
    if (!userId) return null;
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email, company_name")
      .eq("id", userId)
      .maybeSingle();
    return data as { id: string; email: string | null; company_name: string | null } | null;
  };
  const dropNotification = async (userId: string, type: string, payload: Record<string, unknown>) => {
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type, payload });
  };

  try {
    if (body.kind === "outbid") {
      // Find the previous high bidder (the one before the current_bidder).
      const { data: bids } = await supabaseAdmin
        .from("auction_bids")
        .select("bidder_id, amount_eur")
        .eq("auction_id", auction.id)
        .order("placed_at", { ascending: false })
        .limit(2);
      const prev = (bids ?? []).find((b) => b.bidder_id !== auction.current_bidder);
      if (!prev) return new Response(JSON.stringify({ ok: true, skipped: "no_prev_bidder" }), { status: 200 });
      const prof = await profile(prev.bidder_id);
      if (!prof?.email) return new Response(JSON.stringify({ ok: true, skipped: "no_email" }), { status: 200 });

      await dropNotification(prev.bidder_id, "auction_outbid", {
        auction_id: auction.id, listing_id: auction.listing_id, new_high: auction.current_bid_eur,
      });

      const tpl = tplOutbid({
        recipientName: prof.company_name,
        listingTitle,
        newHigh: Number(auction.current_bid_eur ?? 0),
        endAt: auction.end_at,
        auctionId: auction.id,
      });
      await sendEmail({ to: prof.email, subject: tpl.subject, html: tpl.html, text: tpl.text, category: "all", userId: prof.id });
      sentTo.push(prof.email);
    }

    if (body.kind === "won" && auction.status === "sold" && auction.winner_id) {
      const prof = await profile(auction.winner_id);
      if (prof?.email) {
        await dropNotification(auction.winner_id, "auction_won", {
          auction_id: auction.id, listing_id: auction.listing_id, final_price: auction.current_bid_eur,
        });
        const tpl = tplWon({
          recipientName: prof.company_name,
          listingTitle,
          finalPrice: Number(auction.current_bid_eur ?? 0),
          buyerPremiumPct: Number(auction.buyer_premium_pct ?? 5),
          auctionId: auction.id,
        });
        await sendEmail({ to: prof.email, subject: tpl.subject, html: tpl.html, text: tpl.text, category: "all", userId: prof.id });
        sentTo.push(prof.email);
      }
    }

    if (body.kind === "settled") {
      const prof = await profile(auction.seller_id);
      if (prof?.email) {
        const t = auction.status === "sold" ? "auction_seller_sold" : "auction_seller_unsold";
        await dropNotification(auction.seller_id, t, {
          auction_id: auction.id, listing_id: auction.listing_id, status: auction.status, final_price: auction.current_bid_eur,
        });
        const tpl = tplSellerSettled({
          recipientName: prof.company_name,
          listingTitle,
          status: auction.status === "sold" ? "sold" : "reserve_not_met",
          finalPrice: auction.current_bid_eur != null ? Number(auction.current_bid_eur) : null,
          auctionId: auction.id,
        });
        await sendEmail({ to: prof.email, subject: tpl.subject, html: tpl.html, text: tpl.text, category: "all", userId: prof.id });
        sentTo.push(prof.email);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send error";
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, sent_to: sentTo }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
