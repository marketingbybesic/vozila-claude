// Croatian-locale email templates for auction events. Same pattern as the
// templates in _shared/email.ts — return { subject, html, text } and let
// the caller route through sendEmail().

import { EMAIL_PUBLIC_SITE_URL } from "./email.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtEur(n: number): string {
  return n.toLocaleString("hr-HR") + " €";
}

export function tplOutbid(args: {
  recipientName: string | null;
  listingTitle: string;
  newHigh: number;
  endAt: string;
  auctionId: string;
}): { subject: string; html: string; text: string } {
  const url = `${EMAIL_PUBLIC_SITE_URL}/aukcija/${args.auctionId}`;
  const ends = new Date(args.endAt).toLocaleString("hr-HR", { dateStyle: "short", timeStyle: "short" });
  const subject = `Niste više najbolji ponuđač — ${args.listingTitle} | Vozila.hr`;
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Netko je nadmašio vašu ponudu za "${args.listingTitle}".`,
    `Nova najviša ponuda: ${fmtEur(args.newHigh)}.`,
    `Aukcija završava: ${ends}.`,
    ``,
    `Vratite se i licitirajte: ${url}`,
  ].join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
      <p><b>Netko je nadmašio vašu ponudu</b> za:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
        <b>${escapeHtml(args.listingTitle)}</b><br/>
        <span style="color:#666">Nova najviša ponuda: <b>${fmtEur(args.newHigh)}</b></span><br/>
        <span style="color:#666">Završava: ${ends}</span>
      </p>
      <p style="margin-top:28px">
        <a href="${url}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;text-decoration:none;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;font-size:11px">Vratite se na aukciju</a>
      </p>
    </div>`;
  return { subject, html, text };
}

export function tplWon(args: {
  recipientName: string | null;
  listingTitle: string;
  finalPrice: number;
  buyerPremiumPct: number;
  auctionId: string;
}): { subject: string; html: string; text: string } {
  const url = `${EMAIL_PUBLIC_SITE_URL}/aukcija/${args.auctionId}`;
  const total = Math.round(args.finalPrice * (1 + args.buyerPremiumPct / 100));
  const subject = `Pobijedili ste aukciju — ${args.listingTitle} | Vozila.hr`;
  const text = [
    `Čestitamo${args.recipientName ? ` ${args.recipientName}` : ""}!`,
    ``,
    `Pobijedili ste aukciju za "${args.listingTitle}".`,
    `Konačna cijena: ${fmtEur(args.finalPrice)}.`,
    `Buyer premium ${args.buyerPremiumPct}%: ${fmtEur(total - args.finalPrice)}.`,
    `Ukupno: ${fmtEur(total)}.`,
    ``,
    `Sljedeći korak — naš tim će vas kontaktirati u 24h za dogovor preuzimanja i plaćanja.`,
    ``,
    `Detalji: ${url}`,
  ].join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:18px">Čestitamo${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""}!</p>
      <p>Pobijedili ste aukciju za:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
        <b>${escapeHtml(args.listingTitle)}</b><br/>
        <span style="color:#666">Konačna cijena: <b>${fmtEur(args.finalPrice)}</b></span><br/>
        <span style="color:#666">Buyer premium ${args.buyerPremiumPct}%: ${fmtEur(total - args.finalPrice)}</span><br/>
        <span style="color:#666">Ukupno za uplatu: <b>${fmtEur(total)}</b></span>
      </p>
      <p>Sljedeći korak — naš tim kontaktirat će vas u 24h za dogovor preuzimanja i plaćanja.</p>
      <p style="margin-top:28px">
        <a href="${url}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;text-decoration:none;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;font-size:11px">Pogledaj aukciju</a>
      </p>
    </div>`;
  return { subject, html, text };
}

export function tplAuctionApproved(args: {
  recipientName: string | null;
  listingTitle: string;
  auctionId: string;
  notes: string | null;
}): { subject: string; html: string; text: string } {
  const url = `${EMAIL_PUBLIC_SITE_URL}/aukcija/${args.auctionId}`;
  const subject = `Aukcija odobrena — ${args.listingTitle} | Vozila.hr`;
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Vaša aukcija "${args.listingTitle}" je odobrena i objavljena na Vozila.hr.`,
    args.notes ? `\nBilješka administratora: ${args.notes}\n` : ``,
    `Pratite licitiranje: ${url}`,
  ].join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
      <p>Vaša aukcija je <b>odobrena</b> i sada je javno objavljena:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
        <b>${escapeHtml(args.listingTitle)}</b>
      </p>
      ${args.notes ? `<p style="margin:16px 0;padding:12px 14px;border-left:3px solid #d22;color:#555">${escapeHtml(args.notes)}</p>` : ""}
      <p style="margin-top:28px"><a href="${url}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;text-decoration:none;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;font-size:11px">Otvori aukciju</a></p>
    </div>`;
  return { subject, html, text };
}

export function tplAuctionRejected(args: {
  recipientName: string | null;
  listingTitle: string;
  auctionId: string;
  notes: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `Aukcija nije odobrena — ${args.listingTitle} | Vozila.hr`;
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Vaša aukcija "${args.listingTitle}" nije odobrena za javnu objavu.`,
    args.notes ? `\nRazlog: ${args.notes}\n` : ``,
    `Možete urediti oglas i poslati novu aukciju.`,
  ].join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
      <p>Vaša aukcija <b>nije odobrena</b> za javnu objavu:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
        <b>${escapeHtml(args.listingTitle)}</b>
      </p>
      ${args.notes ? `<p style="margin:16px 0;padding:12px 14px;border-left:3px solid #d22;color:#555"><b>Razlog:</b><br/>${escapeHtml(args.notes)}</p>` : ""}
      <p>Možete urediti oglas i poslati novu aukciju.</p>
    </div>`;
  return { subject, html, text };
}

export function tplSellerSettled(args: {
  recipientName: string | null;
  listingTitle: string;
  status: "sold" | "reserve_not_met";
  finalPrice: number | null;
  auctionId: string;
}): { subject: string; html: string; text: string } {
  const url = `${EMAIL_PUBLIC_SITE_URL}/aukcija/${args.auctionId}`;
  if (args.status === "sold" && args.finalPrice != null) {
    const subject = `Aukcija završena — ${args.listingTitle} prodano za ${fmtEur(args.finalPrice)} | Vozila.hr`;
    const text = [
      `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
      ``,
      `Vaša aukcija "${args.listingTitle}" je završena. Vozilo je prodano za ${fmtEur(args.finalPrice)}.`,
      `Naš tim povezat će vas s kupcem u 24h.`,
      ``,
      `Detalji: ${url}`,
    ].join("\n");
    const html = `
      <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
        <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
        <p>Vaša aukcija je završena s prodajom:</p>
        <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
          <b>${escapeHtml(args.listingTitle)}</b><br/>
          <span style="color:#666">Konačna cijena: <b>${fmtEur(args.finalPrice)}</b></span>
        </p>
        <p>Naš tim povezat će vas s kupcem u 24h.</p>
        <p style="margin-top:28px"><a href="${url}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;text-decoration:none;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;font-size:11px">Detalji</a></p>
      </div>`;
    return { subject, html, text };
  }
  // reserve_not_met
  const subject = `Aukcija završena bez prodaje — ${args.listingTitle} | Vozila.hr`;
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Vaša aukcija "${args.listingTitle}" je završila bez prodaje (rezerva nije dostignuta).`,
    `Možete pokrenuti novu aukciju s nižom rezervom ili objaviti oglas po fiksnoj cijeni.`,
    ``,
    `Detalji: ${url}`,
  ].join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
      <p>Vaša aukcija je završila <b>bez prodaje</b> — rezerva nije dostignuta:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
        <b>${escapeHtml(args.listingTitle)}</b>
      </p>
      <p>Možete pokrenuti novu aukciju s nižom rezervom ili objaviti oglas po fiksnoj cijeni.</p>
      <p style="margin-top:28px"><a href="${url}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;text-decoration:none;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;font-size:11px">Detalji</a></p>
    </div>`;
  return { subject, html, text };
}
