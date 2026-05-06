// GET /functions/v1/vin-url-expiry-digest
// Scheduled daily 09:00 Europe/Zagreb. Finds delivered vin_reports whose
// signed URL expires within the next 7 days AND we haven't already
// nudged the buyer about this report. Sends a 'about to expire' email
// with a link to /postavke (where the refresh-on-click flow lives).
//
// Idempotent via the 30-day notifications-row dedupe pattern keyed on
// (user_id, type='vin_url_expiring', payload->>report_id).

import { withCron } from "../_shared/cron.ts";
import { sendEmail } from "../_shared/email.ts";
import { tplVinReportExpiring } from "../_shared/email-vin.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const NOTIFY_DAYS_BEFORE_EXPIRY = 7;
const DEDUPE_DAYS = 30;

interface DeliveredRow {
  id: string;
  user_id: string | null;
  vin: string;
  signed_url_expires_at: string;
}

Deno.serve(async () => {
  try {
    const result = await withCron("vin-url-expiry-digest", async () => {
      const now = Date.now();
      const horizonIso = new Date(now + NOTIFY_DAYS_BEFORE_EXPIRY * 86_400_000).toISOString();

      // Pull delivered rows whose URL expires inside the horizon. Ordering
      // by expires_at ascending so the soonest-to-expire goes first if we
      // ever cap the batch.
      const { data: rows, error } = await supabaseAdmin
        .from("vin_reports")
        .select("id, user_id, vin, signed_url_expires_at")
        .eq("status", "delivered")
        .not("signed_url_expires_at", "is", null)
        .lte("signed_url_expires_at", horizonIso)
        .gt("signed_url_expires_at", new Date(now).toISOString())  // not already past expiry
        .order("signed_url_expires_at", { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);

      let sent = 0;
      let skipped = 0;

      const dedupeSinceIso = new Date(now - DEDUPE_DAYS * 86_400_000).toISOString();

      for (const row of (rows ?? []) as DeliveredRow[]) {
        if (!row.user_id) { skipped++; continue; }

        // Dedupe: skip if we already nudged this buyer about this report
        // in the last 30 days.
        const { data: dup } = await supabaseAdmin
          .from("notifications")
          .select("id")
          .eq("user_id", row.user_id)
          .eq("type", "vin_url_expiring")
          .eq("payload->>report_id", row.id)
          .gte("created_at", dedupeSinceIso)
          .limit(1);
        if ((dup?.length ?? 0) > 0) { skipped++; continue; }

        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("email, company_name")
          .eq("id", row.user_id)
          .maybeSingle();

        // Drop the notification row regardless of email outcome, so the
        // bell flyout shows the heads-up + dedupe key gets set.
        await supabaseAdmin.from("notifications").insert({
          user_id: row.user_id,
          type: "vin_url_expiring",
          payload: {
            report_id: row.id,
            vin: row.vin,
            expires_at: row.signed_url_expires_at,
          },
        });

        if (!prof?.email) { skipped++; continue; }

        const tpl = tplVinReportExpiring({
          recipientName: prof.company_name as string | null,
          vin: row.vin,
          expiresAt: row.signed_url_expires_at,
        });

        const result = await sendEmail({
          to: prof.email as string,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          category: "all",
          userId: row.user_id,
        });
        if (result.ok) sent++;
        else skipped++;
      }

      return { processed: (rows ?? []).length, sent, skipped };
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
