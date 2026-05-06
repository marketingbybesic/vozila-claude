// POST /functions/v1/notify-inspection-event
// Body: { kind: 'assigned' | 'canceled', booking_id: string }
// Auth: user JWT (inspector for 'assigned'; buyer for 'canceled') OR service-role.
//
// Routes lifecycle events to the buyer's email + drops a notifications row.
// Same dedupe window pattern as notify-auction-event.

import { sendEmail } from "../_shared/email.ts";
import { tplInspectionAssigned, tplInspectionCanceled } from "../_shared/email-inspections.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface Body {
  kind: "assigned" | "canceled";
  booking_id: string;
}

const DEDUPE_WINDOW_MIN = 30;

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
  if (!body.booking_id || !body.kind) return new Response("Missing fields", { status: 400 });

  const { data: booking } = await supabaseAdmin
    .from("inspection_bookings")
    .select("id, user_id, listing_id, address, preferred_date, preferred_time_window, status, paid_eur")
    .eq("id", body.booking_id)
    .maybeSingle();
  if (!booking) return new Response("Booking not found", { status: 404 });
  if (!booking.user_id) return new Response(JSON.stringify({ ok: true, skipped: "no_user" }), { status: 200 });

  // Dedupe.
  const sinceIso = new Date(Date.now() - DEDUPE_WINDOW_MIN * 60 * 1000).toISOString();
  const notifType = body.kind === "assigned" ? "inspection_assigned" : "inspection_canceled";
  const { data: dup } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", booking.user_id)
    .eq("type", notifType)
    .eq("payload->>booking_id", body.booking_id)
    .gte("created_at", sinceIso)
    .limit(1);
  if ((dup?.length ?? 0) > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: "dedupe" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("email, company_name")
    .eq("id", booking.user_id)
    .maybeSingle();

  await supabaseAdmin.from("notifications").insert({
    user_id: booking.user_id,
    type: notifType,
    payload: {
      booking_id: booking.id,
      listing_id: booking.listing_id,
      address: booking.address,
    },
  });

  if (!prof?.email) {
    return new Response(JSON.stringify({ ok: true, emailed: false }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const tpl = body.kind === "assigned"
    ? tplInspectionAssigned({
        recipientName: prof.company_name as string | null,
        address: booking.address as string,
        preferredDate: booking.preferred_date as string | null,
        preferredWindow: booking.preferred_time_window as string | null,
        listingId: booking.listing_id as string | null,
        bookingId: booking.id as string,
      })
    : tplInspectionCanceled({
        recipientName: prof.company_name as string | null,
        refunded: booking.status === "canceled" && (booking.paid_eur ?? 0) > 0,
        paidEur: booking.paid_eur as number | null,
        refundId: null,
      });

  const result = await sendEmail({
    to: prof.email as string,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    category: "all",
    userId: booking.user_id as string,
  });

  return new Response(JSON.stringify({ ok: result.ok, emailed: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
