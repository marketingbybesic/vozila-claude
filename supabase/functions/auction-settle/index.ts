// GET /functions/v1/auction-settle
// Scheduled every 5 minutes. Calls settle_ended_auctions() Postgres function
// which flips 'live' auctions whose end_at has passed to 'sold' or
// 'reserve_not_met'. Wrapped in withCron heartbeat.

import { supabaseAdmin } from "../_shared/supabase.ts";
import { withCron } from "../_shared/cron.ts";

Deno.serve(async () => {
  try {
    const result = await withCron("auction-settle", async () => {
      const { data, error } = await supabaseAdmin.rpc("settle_ended_auctions");
      if (error) throw new Error(error.message);
      return { settled: (data as number) ?? 0 };
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
