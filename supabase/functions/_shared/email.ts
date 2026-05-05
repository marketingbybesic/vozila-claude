// Resend wrapper + simple template registry.
// All transactional + digest emails route through here. HMAC-signed
// unsubscribe links generated server-side (signed with EMAIL_HMAC_SECRET).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Vozila <noreply@vozila.hr>";
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") ?? "https://testiranje.cloud";
const EMAIL_HMAC_SECRET = Deno.env.get("EMAIL_HMAC_SECRET") ?? "";

export type EmailCategory =
  | "saved_search_digest"
  | "marketing"
  | "all";

export interface SendOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  // For unsubscribe headers + footer link.
  category: EmailCategory;
  userId: string;
  // List-Unsubscribe header URL (RFC 8058 one-click).
  replyTo?: string;
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate a one-click unsubscribe URL. Token is HMAC(userId|category).
export async function makeUnsubUrl(userId: string, category: EmailCategory): Promise<string> {
  const payload = `${userId}|${category}`;
  const sig = await hmacSha256(EMAIL_HMAC_SECRET, payload);
  const t = btoa(payload).replace(/=+$/, "");
  return `${PUBLIC_SITE_URL}/api/unsubscribe?t=${encodeURIComponent(t)}&s=${sig}`;
}

export async function verifyUnsubToken(t: string, s: string): Promise<{ userId: string; category: EmailCategory } | null> {
  try {
    const payload = atob(t);
    const expected = await hmacSha256(EMAIL_HMAC_SECRET, payload);
    if (expected !== s) return null;
    const [userId, category] = payload.split("|");
    if (!userId || !category) return null;
    if (category !== "saved_search_digest" && category !== "marketing" && category !== "all") return null;
    return { userId, category };
  } catch {
    return null;
  }
}

export async function sendEmail(opts: SendOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY missing — would have sent:", opts.subject, "to", opts.to);
    return { ok: false, error: "RESEND_API_KEY missing" };
  }

  const unsub = await makeUnsubUrl(opts.userId, opts.category);
  const footer = `\n\n— Vozila.hr • Otkažite obavijesti: ${unsub}`;
  const htmlFooter = `
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px"/>
    <p style="font:300 12px/1.6 system-ui,sans-serif;color:#888;letter-spacing:0.04em">
      Vozila.hr — premium hrvatski marketplace za vozila.<br/>
      <a href="${unsub}" style="color:#888">Otkažite ovu vrstu obavijesti</a>
    </p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html + htmlFooter,
      text: opts.text + footer,
      reply_to: opts.replyTo,
      headers: {
        "List-Unsubscribe": `<${unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `(${res.status}) ${body}` };
  }
  const j = await res.json().catch(() => ({} as { id?: string }));
  return { ok: true, id: j.id };
}

// Templates are simple Croatian-locale string builders. Keep them here so
// every Edge Function reuses the same voice.

export function tplNewMessage(args: {
  recipientName: string | null;
  senderName: string | null;
  listingTitle: string;
  listingPrice: number;
  body: string;
  threadUrl: string;
}): { subject: string; html: string; text: string } {
  const sender = args.senderName ?? "Korisnik";
  const subject = `Nova poruka o ${args.listingTitle} | Vozila.hr`;
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `${sender} vam je poslao/la poruku o vašem oglasu "${args.listingTitle}" (${args.listingPrice.toLocaleString("hr-HR")} €):`,
    ``,
    args.body,
    ``,
    `Odgovorite na: ${args.threadUrl}`,
  ].join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},</p>
      <p><b>${sender}</b> vam je poslao/la poruku o vašem oglasu:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
        <b>${args.listingTitle}</b><br/>
        <span style="color:#666">${args.listingPrice.toLocaleString("hr-HR")} €</span>
      </p>
      <blockquote style="border-left:3px solid #d22;padding:8px 16px;margin:16px 0;color:#444">
        ${escapeHtml(args.body)}
      </blockquote>
      <p style="margin-top:28px">
        <a href="${args.threadUrl}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;text-decoration:none;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;font-size:11px">Odgovori</a>
      </p>
    </div>`;
  return { subject, html, text };
}

export function tplSavedSearchDigest(args: {
  recipientName: string | null;
  searchLabel: string;
  matches: { id: string; title: string; price: number; url: string; thumb?: string | null }[];
}): { subject: string; html: string; text: string } {
  const subject = `${args.matches.length} ${args.matches.length === 1 ? "novo vozilo" : "novih vozila"} za "${args.searchLabel}" | Vozila.hr`;
  const lines = args.matches.map(
    (m) => `• ${m.title} — ${m.price.toLocaleString("hr-HR")} €\n  ${m.url}`,
  ).join("\n\n");
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Imate ${args.matches.length} ${args.matches.length === 1 ? "novo vozilo" : "novih vozila"} za vašu spremljenu pretragu "${args.searchLabel}":`,
    ``,
    lines,
  ].join("\n");
  const cards = args.matches.map((m) => `
    <a href="${m.url}" style="display:block;text-decoration:none;color:#222;border:1px solid #ddd;padding:12px;margin-bottom:10px">
      ${m.thumb ? `<img src="${m.thumb}" style="width:100%;max-width:480px;height:auto;display:block;margin-bottom:10px"/>` : ""}
      <div style="font-weight:400">${escapeHtml(m.title)}</div>
      <div style="color:#666;margin-top:4px">${m.price.toLocaleString("hr-HR")} €</div>
    </a>`).join("");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},</p>
      <p>${args.matches.length} ${args.matches.length === 1 ? "novo vozilo odgovara" : "novih vozila odgovara"} pretrazi <b>"${escapeHtml(args.searchLabel)}"</b>.</p>
      ${cards}
      <p style="margin-top:24px;color:#888">Postavite više pretraga na <a href="${PUBLIC_SITE_URL}/pretraga">Vozila.hr</a>.</p>
    </div>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const EMAIL_PUBLIC_SITE_URL = PUBLIC_SITE_URL;
