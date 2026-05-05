// GET /functions/v1/auction-settle
// Scheduled every 5 minutes. Calls settle_ended_auctions() Postgres function
// which flips 'live' auctions whose end_at has passed to 'sold' or
// 'reserve_not_met'. Wrapped in withCron heartbeat.
//
// On settle, also fires off seller-settled + buyer-won emails via
// notify-auction-event for each newly-settled auction. The
// settle_ended_auctions() fn returns just a count, so we re-query rows
// settled in the last 5 minutes to find which auctions to notify on.

import { supabaseAdmin } from "../_shared/supabase.ts";
import { withCron } from "../_shared/cron.ts";

const FUNCTIONS_BASE = (() => {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  return url ? `${url.replace(/\/$/, "")}/functions/v1` : "";
})();

async function dispatch(kind: "won" | "settled", auctionId: string) {
  if (!FUNCTIONS_BASE) return;
  try {
    await fetch(`${FUNCTIONS_BASE}/notify-auction-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
      },
      body: JSON.stringify({ kind, auction_id: auctionId }),
    });
  } catch {
    // best-effort
  }
}

Deno.serve(async () => {
  try {
    const result = await withCron("auction-settle", async () => {
      const { data: count, error } = await supabaseAdmin.rpc("settle_ended_auctions");
      if (error) throw new Error(error.message);

      // If anything settled, find rows settled in the last few minutes and
      // dispatch notifications. Idempotency: notifications-table inserts
      // from notify-auction-event repeat on cron retries — admin can dedupe
      // in a polish pass.
      let dispatched = 0;
      if ((count as number) > 0) {
        const since = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // last 6 min
        const { data: recentlySettled } = await supabaseAdmin
          .from("auctions")
          .select("id, status, winner_id")
          .gte("settled_at", since)
          .in("status", ["sold", "reserve_not_met"]);
        for (const a of (recentlySettled ?? []) as { id: string; status: string; winner_id: string | null }[]) {
          await dispatch("settled", a.id);            // seller email
          if (a.status === "sold" && a.winner_id) await dispatch("won", a.id); // buyer email
          dispatched++;
        }
      }

      return { settled: (count as number) ?? 0, dispatched };
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
