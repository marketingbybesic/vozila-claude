// GET /functions/v1/expire-featured
// Scheduled daily 02:00 Europe/Zagreb via Supabase cron.
// Unsets is_featured for listings whose featured_until is in the past.

import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async () => {
  const { error, count } = await supabaseAdmin
    .from("listings")
    .update({ is_featured: false, featured_tier: null })
    .lt("featured_until", new Date().toISOString())
    .eq("is_featured", true)
    .select("id", { count: "exact", head: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ expired: count ?? 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
