// POST /functions/v1/send-email
// Generic Resend wrapper used by Edge Functions (and by the Postgres
// trigger via pg_net) to send transactional + digest emails.
//
// Body: { to, subject, html, text, category, user_id, reply_to? }
// Auth: requires SERVICE_ROLE_KEY in Authorization header
// (Edge-to-Edge call). Not exposed to public.

import { sendEmail, type EmailCategory } from "../_shared/email.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface Body {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: EmailCategory;
  user_id: string;
  reply_to?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Service-role auth check.
  const auth = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`;
  if (!auth || auth !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Body;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  if (!body.to || !body.subject || !body.user_id || !body.category) {
    return new Response("Missing fields", { status: 400 });
  }

  // Honour the user's unsubscribe preference: skip if unsubscribed for this
  // category OR for 'all'.
  const { data: unsub } = await supabaseAdmin
    .from("email_unsubscribes")
    .select("category")
    .eq("user_id", body.user_id)
    .in("category", [body.category, "all"]);
  if (unsub && unsub.length > 0) {
    return new Response(JSON.stringify({ ok: true, skipped: "unsubscribed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await sendEmail({
    to: body.to,
    subject: body.subject,
    html: body.html,
    text: body.text,
    category: body.category,
    userId: body.user_id,
    replyTo: body.reply_to,
  });

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
});
