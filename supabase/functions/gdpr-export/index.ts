// POST /functions/v1/gdpr-export
// Auth: user JWT.
// Generates a JSON dump of the user's data (listings, messages, leads,
// reviews, saved searches, notifications, bookings, vin reports). Returns
// a one-time signed URL that expires in 24h.
//
// For v1 the response is the JSON body inline (small users) and a job row
// is also written to gdpr_export_jobs for audit. Admin-side review queue
// can later assemble a ZIP for large accounts.

import { preflight, json } from "../_shared/cors.ts";
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

  // Audit job row.
  const { data: job } = await supabaseAdmin
    .from("gdpr_export_jobs")
    .insert({ user_id: user.id, status: "pending" })
    .select("id")
    .single();

  // Pull every PII-bearing surface in parallel.
  const [
    profile, listings, messages, leads, reviews, savedSearches,
    notifications, inspections, vinReports, conversations,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabaseAdmin.from("listings").select("*").eq("user_id", user.id),
    supabaseAdmin.from("messages").select("*").eq("sender_id", user.id),
    supabaseAdmin.from("leads").select("*").eq("user_id", user.id),
    supabaseAdmin.from("reviews").select("*").or(`buyer_id.eq.${user.id},dealer_id.eq.${user.id}`),
    supabaseAdmin.from("saved_searches").select("*").eq("user_id", user.id),
    supabaseAdmin.from("notifications").select("*").eq("user_id", user.id),
    supabaseAdmin.from("inspection_bookings").select("*").eq("user_id", user.id),
    supabaseAdmin.from("vin_reports").select("*").eq("user_id", user.id),
    supabaseAdmin.from("conversations").select("*").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
  ]);

  const dump = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: profile.data ?? null,
    listings: listings.data ?? [],
    conversations: conversations.data ?? [],
    messages_sent: messages.data ?? [],
    leads: leads.data ?? [],
    reviews: reviews.data ?? [],
    saved_searches: savedSearches.data ?? [],
    notifications: notifications.data ?? [],
    inspection_bookings: inspections.data ?? [],
    vin_reports: vinReports.data ?? [],
  };

  if (job?.id) {
    await supabaseAdmin
      .from("gdpr_export_jobs")
      .update({
        status: "ready",
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", job.id);
  }

  return new Response(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="vozila-export-${user.id.slice(0, 8)}.json"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
});
