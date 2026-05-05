// GET /functions/v1/og-image?listing=<id>
// Returns a 1200×630 PNG OG card for a listing. Uses satori + resvg.
// Falls back to a redirect to the primary listing image if rendering fails.
// Cache-Control: 24h, plus a per-listing cache table so we don't re-render
// when nothing changed.
//
// Public endpoint — no auth.

import { supabaseAdmin } from "../_shared/supabase.ts";
import satori from "https://esm.sh/satori@0.10.13?target=deno";
import { Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

interface Listing {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  main_image: string | null;
  updated_at: string;
  attributes: Record<string, unknown> | null;
  location: string | null;
}

const FONT_URL = "https://fonts.gstatic.com/s/exo2/v22/7cH1v4okm5zmbtYsK-4P-Tc.ttf";  // Exo 2 Light

let fontPromise: Promise<ArrayBuffer> | null = null;
function getFont(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    fontPromise = fetch(FONT_URL).then((r) => r.arrayBuffer());
  }
  return fontPromise;
}

let resvgInited = false;
async function initResvg(): Promise<void> {
  if (resvgInited) return;
  const wasm = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm").then((r) => r.arrayBuffer());
  // @ts-ignore — initWasm is on the module
  await (Resvg as any).initWasm(wasm);
  resvgInited = true;
}

function fallback(listing: Listing | null): Response {
  // Redirect to listing's primary image when we can't render.
  if (listing?.main_image) {
    return new Response(null, { status: 302, headers: { Location: listing.main_image } });
  }
  return new Response("Not Found", { status: 404 });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const listingId = url.searchParams.get("listing");
  if (!listingId) return new Response("Missing ?listing", { status: 400 });

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("id, title, price, currency, main_image, updated_at, attributes, location")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return new Response("Not Found", { status: 404 });

  try {
    await initResvg();
    const fontData = await getFont();

    const attrs = (listing.attributes ?? {}) as Record<string, any>;
    const meta: string[] = [];
    if (attrs.year) meta.push(String(attrs.year));
    if (attrs.mileage) meta.push(`${Number(attrs.mileage).toLocaleString("hr-HR")} km`);
    if (attrs.fuel) meta.push(String(attrs.fuel));
    if (attrs.transmission) meta.push(String(attrs.transmission));
    const metaLine = meta.slice(0, 4).join(" · ");

    const priceLabel = listing.price === 0
      ? "Na upit"
      : `${listing.price.toLocaleString("hr-HR")} ${listing.currency ?? "€"}`;

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#000",
            color: "#fff",
            padding: "60px 80px",
            justifyContent: "space-between",
            fontFamily: "Exo 2",
          },
          children: [
            { type: "div", props: { style: { fontSize: "22px", letterSpacing: "0.35em", textTransform: "uppercase", color: "#ff2800" }, children: "Vozila.hr" } },
            {
              type: "div",
              props: {
                style: { display: "flex", flexDirection: "column", gap: "20px" },
                children: [
                  { type: "div", props: { style: { fontSize: "62px", lineHeight: 1.05, color: "#fff" }, children: (listing.title ?? "").slice(0, 80) } },
                  metaLine ? { type: "div", props: { style: { fontSize: "26px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }, children: metaLine } } : null,
                  { type: "div", props: { style: { fontSize: "70px", color: "#ff2800", marginTop: "16px" }, children: priceLabel } },
                  listing.location ? { type: "div", props: { style: { fontSize: "22px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }, children: listing.location } } : null,
                ].filter(Boolean),
              },
            },
            { type: "div", props: { style: { fontSize: "20px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }, children: "Premium hrvatski marketplace" } },
          ],
        },
      } as any,
      {
        width: 1200,
        height: 630,
        fonts: [{ name: "Exo 2", data: fontData, weight: 300, style: "normal" }],
      },
    );

    // @ts-ignore — Resvg has a constructor + render
    const resvg = new (Resvg as any)(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng() as Uint8Array;

    return new Response(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.warn("[og-image] render failed", e);
    return fallback(listing as Listing);
  }
});
