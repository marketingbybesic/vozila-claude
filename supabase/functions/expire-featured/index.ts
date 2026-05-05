// GET /functions/v1/expire-featured
// Scheduled daily 02:00 Europe/Zagreb via Supabase cron.
// Unsets is_featured for listings whose featured_until is in the past.

import { supabaseAdmin } from "../_shared/supabase.ts";
import { withCron } from "../_shared/cron.ts";

Deno.serve(async () => {
  try {
    const result = await withCron("expire-featured", async () => {
      const { error, count } = await supabaseAdmin
        .from("listings")
        .update({ is_featured: false, featured_tier: null })
        .lt("featured_until", new Date().toISOString())
        .eq("is_featured", true)
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return { expired: count ?? 0 };
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
