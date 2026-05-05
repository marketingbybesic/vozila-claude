// GET /functions/v1/sitemap.xml
// Streams a single sitemap (sub-50k URLs, no chunking yet — split when needed).
// Includes: home + 10 categories + active listings + verified dealer pages.
// Cache-Control: 6 hours.
//
// Public endpoint — no auth.

import { supabaseAdmin } from "../_shared/supabase.ts";
import { EMAIL_PUBLIC_SITE_URL } from "../_shared/email.ts";

const BASE = EMAIL_PUBLIC_SITE_URL;

const STATIC_URLS = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/o-nama", priority: "0.5", changefreq: "monthly" },
  { loc: "/za-partnere", priority: "0.7", changefreq: "weekly" },
  { loc: "/kontakt", priority: "0.5", changefreq: "monthly" },
  { loc: "/saloni", priority: "0.7", changefreq: "weekly" },
  { loc: "/privatnost", priority: "0.3", changefreq: "yearly" },
  { loc: "/uvjeti-koristenja", priority: "0.3", changefreq: "yearly" },
];

const CATEGORY_SLUGS = [
  "osobni-automobili", "motocikli", "bicikli-romobili", "kombiji-laki-teretni",
  "kamioni-teretna", "strojevi", "plovila-nautika", "kamperi-karavani",
  "dijelovi-oprema", "usluge",
];

function urlEntry(loc: string, lastmod?: string, priority = "0.7", changefreq = "weekly"): string {
  return `  <url>
    <loc>${BASE}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

Deno.serve(async () => {
  // Active listings (paginated through with reasonable limit for v1).
  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id, updated_at, status")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(40000);

  // Verified dealers (paid subscribers).
  const { data: dealers } = await supabaseAdmin
    .from("profiles")
    .select("id, email, updated_at, subscription_tier, subscription_status")
    .not("subscription_tier", "is", null)
    .in("subscription_status", ["active", "trialing"])
    .limit(2000);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  for (const u of STATIC_URLS) {
    parts.push(urlEntry(u.loc, undefined, u.priority, u.changefreq));
  }

  for (const slug of CATEGORY_SLUGS) {
    parts.push(urlEntry(`/${slug}`, undefined, "0.8", "daily"));
  }

  for (const l of (listings ?? []) as { id: string; updated_at: string }[]) {
    parts.push(urlEntry(`/listing/${l.id}`, l.updated_at, "0.6", "weekly"));
  }

  for (const d of (dealers ?? []) as { id: string; email: string; updated_at: string }[]) {
    const local = (d.email ?? "").split("@")[0];
    if (local) parts.push(urlEntry(`/saloni/${local}`, d.updated_at, "0.6", "weekly"));
  }

  parts.push("</urlset>");
  const xml = parts.join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=21600, s-maxage=21600",  // 6h
      "Access-Control-Allow-Origin": "*",
    },
  });
});
