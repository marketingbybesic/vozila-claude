// POST /functions/v1/notify-new-message
// Body: { message_id: string }
// Auth: SERVICE_ROLE_KEY (called by a Postgres trigger via pg_net, or by
// the client right after sending — both work).
//
// Loads the message + conversation + recipient profile, then sends an
// email via Resend AND inserts a notifications row for the bell.

import { sendEmail, tplNewMessage, EMAIL_PUBLIC_SITE_URL } from "../_shared/email.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

interface Body { message_id: string; }

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Allow both service-role auth (server-side trigger) and user JWT
  // (client-side fire-and-forget). With user JWT, a small abuse vector exists:
  // a user could spam this endpoint with valid message_ids of conversations
  // they're not part of. Mitigate by re-checking the message belongs to a
  // conversation where the caller is a participant.
  const auth = req.headers.get("Authorization") ?? "";
  const isServiceRole = auth === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`;

  let callerId: string | null = null;
  if (!isServiceRole) {
    if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const { data, error } = await supabaseAdmin.auth.getUser(auth.slice("Bearer ".length));
    if (error || !data.user) return new Response("Unauthorized", { status: 401 });
    callerId = data.user.id;
  }

  let body: Body;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  if (!body.message_id) return new Response("Missing message_id", { status: 400 });

  const { data: msg } = await supabaseAdmin
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("id", body.message_id)
    .maybeSingle();
  if (!msg) return new Response("Message not found", { status: 404 });

  const { data: conv } = await supabaseAdmin
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id")
    .eq("id", msg.conversation_id)
    .maybeSingle();
  if (!conv) return new Response("Conversation not found", { status: 404 });

  // Validate caller is a participant when called with user JWT.
  if (!isServiceRole && callerId !== conv.buyer_id && callerId !== conv.seller_id) {
    return new Response("Forbidden", { status: 403 });
  }

  const recipientId = msg.sender_id === conv.buyer_id ? conv.seller_id : conv.buyer_id;

  const [{ data: recipient }, { data: sender }, { data: listing }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, email, company_name").eq("id", recipientId).maybeSingle(),
    supabaseAdmin.from("profiles").select("id, email, company_name").eq("id", msg.sender_id).maybeSingle(),
    supabaseAdmin.from("listings").select("id, title, price").eq("id", conv.listing_id).maybeSingle(),
  ]);

  // Insert a notification row for the bell regardless of email opt-in.
  await supabaseAdmin.from("notifications").insert({
    user_id: recipientId,
    type: "new_message",
    payload: { conversation_id: conv.id, message_id: msg.id, listing_id: conv.listing_id },
  });

  if (!recipient?.email || !listing) {
    return new Response(JSON.stringify({ ok: true, emailed: false }), { status: 200 });
  }

  // Skip email if unsubscribed.
  const { data: unsub } = await supabaseAdmin
    .from("email_unsubscribes")
    .select("category")
    .eq("user_id", recipientId)
    .in("category", ["all"]);
  if (unsub && unsub.length > 0) {
    return new Response(JSON.stringify({ ok: true, emailed: false, skipped: "unsubscribed" }), { status: 200 });
  }

  const tpl = tplNewMessage({
    recipientName: recipient.company_name,
    senderName: sender?.company_name ?? null,
    listingTitle: listing.title,
    listingPrice: listing.price,
    body: msg.body,
    threadUrl: `${EMAIL_PUBLIC_SITE_URL}/poruke/${conv.id}`,
  });

  const result = await sendEmail({
    to: recipient.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    category: "all",
    userId: recipientId,
  });

  return new Response(JSON.stringify({ ok: result.ok, emailed: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
