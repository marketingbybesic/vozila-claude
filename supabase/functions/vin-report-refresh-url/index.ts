// POST /functions/v1/vin-report-refresh-url
// Body: { report_id: string }
// Auth: user JWT.
//
// Buyer's "Preuzmi PDF" link expired (30 days post-render). This re-signs
// the SAME stored PDF for another 30 days and returns the fresh URL.
// Updates report_url + signed_url_expires_at on the row so MyPurchasesCard
// can pre-empt expiry next time.

import { preflight, json } from "../_shared/cors.ts";
import { supabaseAsUser, supabaseAdmin } from "../_shared/supabase.ts";

const SIGNED_URL_DAYS = 30;
const STORAGE_BUCKET = "vin-reports";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { report_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!body.report_id) return json({ error: "report_id required" }, 400);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Auth required" }, 401);

  const supabase = supabaseAsUser(authHeader);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Auth invalid" }, 401);

  // Validate ownership + delivered state.
  const { data: report } = await supabase
    .from("vin_reports")
    .select("id, user_id, status, storage_path")
    .eq("id", body.report_id)
    .maybeSingle();
  if (!report) return json({ error: "Report not found" }, 404);
  if (report.user_id !== user.id) return json({ error: "Not your report" }, 403);
  if (report.status !== "delivered") {
    return json({ error: `Report not yet delivered (status: ${report.status}).` }, 400);
  }

  // Recompute path if not stored. Old rows from phase 16 may not have
  // storage_path persisted (column added in 010).
  const path = (report.storage_path as string | null)
    ?? `${report.user_id}/${report.id}.pdf`;

  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DAYS * 86400);

  if (signErr || !signed?.signedUrl) {
    return json({ error: signErr?.message ?? "Sign failed." }, 500);
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_DAYS * 86_400_000).toISOString();

  await supabaseAdmin
    .from("vin_reports")
    .update({
      report_url: signed.signedUrl,
      signed_url_expires_at: expiresAt,
      storage_path: path,
    })
    .eq("id", body.report_id);

  return json({
    ok: true,
    report_url: signed.signedUrl,
    expires_at: expiresAt,
  });
});
