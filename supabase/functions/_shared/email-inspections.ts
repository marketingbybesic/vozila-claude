// Croatian email templates for inspection lifecycle:
//   - tplInspectionAssigned: buyer learns when an inspector claims/admin assigns
//   - tplInspectionCanceled: confirmation after buyer cancels (with refund note)

import { EMAIL_PUBLIC_SITE_URL } from "./email.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const WINDOW_LABEL: Record<string, string> = {
  morning:   "Jutro (8-12h)",
  afternoon: "Poslijepodne (12-18h)",
  evening:   "Večer (18-21h)",
};

export function tplInspectionAssigned(args: {
  recipientName: string | null;
  address: string;
  preferredDate: string | null;
  preferredWindow: string | null;
  listingId: string | null;
  bookingId: string;
}): { subject: string; html: string; text: string } {
  const subject = `Inspektor je preuzeo Vašu rezervaciju | Vozila.hr`;
  const dateStr = args.preferredDate
    ? new Date(args.preferredDate).toLocaleDateString("hr-HR")
    : "termin po dogovoru";
  const windowStr = args.preferredWindow ? WINDOW_LABEL[args.preferredWindow] ?? args.preferredWindow : "";
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Vašu rezervaciju Vozila Inspekcije preuzeo je naš inspektor.`,
    ``,
    `Adresa: ${args.address}`,
    `Datum: ${dateStr}${windowStr ? ` · ${windowStr}` : ""}`,
    ``,
    `Inspektor će Vas kontaktirati za potvrdu točnog vremena.`,
    args.listingId ? `\nIzvorni oglas: ${EMAIL_PUBLIC_SITE_URL}/listing/${args.listingId}` : ``,
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
      <p>Vašu rezervaciju <b>Vozila Inspekcije</b> preuzeo je naš inspektor:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd">
        <b>Adresa:</b> ${escapeHtml(args.address)}<br/>
        <b>Datum:</b> ${escapeHtml(dateStr)}${windowStr ? ` · ${escapeHtml(windowStr)}` : ""}
      </p>
      <p>Inspektor će Vas kontaktirati za potvrdu točnog vremena.</p>
      ${args.listingId ? `<p style="margin-top:16px"><a href="${EMAIL_PUBLIC_SITE_URL}/listing/${args.listingId}" style="color:#888;font-size:12px">Otvori izvorni oglas</a></p>` : ""}
    </div>`;
  return { subject, html, text };
}

export function tplInspectionCanceled(args: {
  recipientName: string | null;
  refunded: boolean;
  paidEur: number | null;
  refundId: string | null;
}): { subject: string; html: string; text: string } {
  const subject = "Vaša rezervacija inspekcije je otkazana | Vozila.hr";
  const refundLine = args.refunded && args.paidEur != null
    ? `Povrat od ${args.paidEur.toLocaleString("hr-HR")} € pokrenut je na Vašu karticu (Stripe refund ${args.refundId ?? ""}). Sredstva obično stignu u 5-10 radnih dana.`
    : "Niste bili naplaćeni — nema povrata sredstava.";
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Otkazali ste svoju rezervaciju Vozila Inspekcije.`,
    ``,
    refundLine,
    ``,
    `Hvala što koristite Vozila.hr.`,
  ].join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
      <p>Otkazali ste svoju rezervaciju <b>Vozila Inspekcije</b>.</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd;color:#444">
        ${escapeHtml(refundLine)}
      </p>
    </div>`;
  return { subject, html, text };
}
