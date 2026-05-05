// GET /functions/v1/saved-searches-digest
// Scheduled daily 08:00 Europe/Zagreb.
// For every saved_search with email_alert=true, replays the search params
// against listings, diffs against last_seen_ids, sends a digest if there
// are net-new matches, then snapshots the new ids.

import { sendEmail, EMAIL_PUBLIC_SITE_URL, type EmailCategory } from "../_shared/email.ts";
import { tplSavedSearchDigest } from "../_shared/email.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { withCron } from "../_shared/cron.ts";

interface SavedSearch {
  id: string;
  user_id: string;
  label: string;
  url: string;
  params: Record<string, unknown>;
  last_seen_ids: string[];
}

interface ListingRow {
  id: string;
  title: string;
  price: number;
  main_image?: string | null;
  category_slug?: string | null;
  attributes?: Record<string, unknown> | null;
  status: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
  company_name: string | null;
}

// Build a Supabase query from the saved-search params JSONB. Fields kept
// in sync with client/src/components/listings/ListingFeed.tsx queryState.
function applyParams(query: any, p: Record<string, any>): any {
  if (!p) return query;
  if (p.category) query = query.eq("category_slug", p.category);
  if (p.price_min) query = query.gte("price", Number(p.price_min));
  if (p.price_max) query = query.lte("price", Number(p.price_max));
  if (p.make) query = query.eq("attributes->>make", String(p.make));
  if (p.model) query = query.eq("attributes->>model", String(p.model));
  if (p.fuel) query = query.eq("attributes->>fuel", String(p.fuel));
  if (p.transmission) query = query.eq("attributes->>transmission", String(p.transmission));
  if (p.year_min) query = query.gte("attributes->>year", Number(p.year_min));
  if (p.year_max) query = query.lte("attributes->>year", Number(p.year_max));
  if (p.mileage_max) query = query.lte("attributes->>mileage", Number(p.mileage_max));
  return query;
}

// 20-hour debounce — never email the same saved search twice within ~a day.
// Uses last_digest_sent_at column populated at the bottom of this loop.
const DEBOUNCE_MS = 20 * 60 * 60 * 1000;

Deno.serve(async () => {
 try {
  const summary = await withCron("saved-searches-digest", async () => {
  // Fetch enabled saved searches that are either un-digested or past debounce.
  const cutoff = new Date(Date.now() - DEBOUNCE_MS).toISOString();
  const { data: searches, error } = await supabaseAdmin
    .from("saved_searches")
    .select("id, user_id, label, url, params, last_seen_ids, last_digest_sent_at")
    .eq("email_alert", true)
    .or(`last_digest_sent_at.is.null,last_digest_sent_at.lt.${cutoff}`);
  if (error) {
    throw new Error(error.message);
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const s of (searches as SavedSearch[] | null) ?? []) {
    try {
      // Run the search.
      let q = supabaseAdmin
        .from("listings")
        .select("id, title, price, main_image, category_slug, attributes, status")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);
      q = applyParams(q, s.params ?? {});
      const { data: rows, error: qErr } = await q;
      if (qErr) { errors++; continue; }
      const matches = (rows ?? []) as ListingRow[];
      const knownSet = new Set(s.last_seen_ids ?? []);
      const fresh = matches.filter((m) => !knownSet.has(m.id));

      if (fresh.length === 0) { skipped++; continue; }

      // Lookup recipient email + name.
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id, email, company_name")
        .eq("id", s.user_id)
        .maybeSingle();
      const profile = prof as ProfileRow | null;
      if (!profile?.email) { skipped++; continue; }

      // Skip if unsubscribed.
      const { data: unsub } = await supabaseAdmin
        .from("email_unsubscribes")
        .select("category")
        .eq("user_id", s.user_id)
        .in("category", ["saved_search_digest", "all"]);
      if (unsub && unsub.length > 0) { skipped++; continue; }

      const tpl = tplSavedSearchDigest({
        recipientName: profile.company_name,
        searchLabel: s.label,
        matches: fresh.slice(0, 8).map((m) => ({
          id: m.id,
          title: m.title,
          price: m.price,
          url: `${EMAIL_PUBLIC_SITE_URL}/listing/${m.id}`,
          thumb: m.main_image ?? null,
        })),
      });

      const result = await sendEmail({
        to: profile.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        category: "saved_search_digest" as EmailCategory,
        userId: s.user_id,
      });
      if (!result.ok) { errors++; continue; }

      // Snapshot the new ids + bump last_digest_sent_at.
      const newIds = matches.map((m) => m.id);
      await supabaseAdmin
        .from("saved_searches")
        .update({
          last_seen_ids: newIds,
          last_digest_sent_at: new Date().toISOString(),
        })
        .eq("id", s.id);

      // Drop a notification row for the bell.
      await supabaseAdmin.from("notifications").insert({
        user_id: s.user_id,
        type: "saved_search_hits",
        payload: { search_id: s.id, count: fresh.length, label: s.label },
      });

      sent++;
    } catch (e) {
      console.error("digest error", e);
      errors++;
    }
  }

  return { sent, skipped, errors, total: searches?.length ?? 0 };
  });

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
 } catch (e) {
  const msg = e instanceof Error ? e.message : "error";
  return new Response(JSON.stringify({ error: msg }), { status: 500 });
 }
});
