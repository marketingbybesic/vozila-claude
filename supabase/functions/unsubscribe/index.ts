// GET /functions/v1/unsubscribe?t=<token>&s=<sig>
// One-click unsubscribe for List-Unsubscribe header + footer link.
// HMAC-verified, idempotent.

import { verifyUnsubToken, EMAIL_PUBLIC_SITE_URL } from "../_shared/email.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const t = url.searchParams.get("t") ?? "";
  const s = url.searchParams.get("s") ?? "";
  const verified = await verifyUnsubToken(t, s);

  if (!verified) {
    return htmlPage(
      "Neispravan link",
      `<p>Link za odjavu nije ispravan ili je istekao. Posjetite <a href="${EMAIL_PUBLIC_SITE_URL}/postavke">postavke</a> da upravljate obavijestima.</p>`,
      400,
    );
  }

  // Idempotent insert.
  await supabaseAdmin
    .from("email_unsubscribes")
    .upsert({ user_id: verified.userId, category: verified.category }, { onConflict: "user_id,category" });

  // RFC 8058 one-click POST returns 200 with no body — but we also accept GET.
  if (req.method === "POST") {
    return new Response("ok", { status: 200 });
  }

  const label =
    verified.category === "all" ? "sve obavijesti"
    : verified.category === "marketing" ? "marketinške obavijesti"
    : "digest spremljenih pretraga";

  return htmlPage(
    "Odjava uspješna",
    `<p>Odjavili ste se s: <b>${label}</b>.</p>
     <p style="margin-top:16px">Možete se vratiti i upravljati obavijestima na
     <a href="${EMAIL_PUBLIC_SITE_URL}/postavke">vašim postavkama</a>.</p>`,
    200,
  );
});

function htmlPage(title: string, bodyHtml: string, status: number): Response {
  return new Response(
    `<!doctype html><html lang="hr"><head><meta charset="utf-8"/><title>${title} | Vozila.hr</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font:300 15px/1.6 system-ui,sans-serif;color:#222;max-width:560px;margin:48px auto;padding:0 20px}h1{font-weight:300;text-transform:uppercase;letter-spacing:0.18em;font-size:18px;margin-bottom:24px}a{color:#d22}</style>
</head><body><h1>${title}</h1>${bodyHtml}</body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
