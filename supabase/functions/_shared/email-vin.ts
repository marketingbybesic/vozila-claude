// Croatian email for "VIN report ready" — sent after vin-report-generator
// renders the PDF, uploads to Storage, and gets a signed URL.

import { EMAIL_PUBLIC_SITE_URL } from "./email.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function tplVinReportReady(args: {
  recipientName: string | null;
  vin: string;
  reportUrl: string;
  expiresAt: string | null;          // signed URL expiry timestamp
  listingId?: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `VIN izvještaj spreman — ${args.vin} | Vozila.hr`;
  const exp = args.expiresAt
    ? new Date(args.expiresAt).toLocaleString("hr-HR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const text = [
    `Pozdrav${args.recipientName ? ` ${args.recipientName}` : ""},`,
    ``,
    `Vaš VIN izvještaj za vozilo ${args.vin} je spreman.`,
    `Preuzmite ga: ${args.reportUrl}`,
    exp ? `Link vrijedi do: ${exp}.` : ``,
    args.listingId ? `\nIzvorni oglas: ${EMAIL_PUBLIC_SITE_URL}/listing/${args.listingId}` : ``,
    ``,
    `Hvala što koristite Vozila.hr.`,
  ].filter(Boolean).join("\n");
  const html = `
    <div style="font:300 14px/1.7 system-ui,sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
      <p>Pozdrav${args.recipientName ? ` ${escapeHtml(args.recipientName)}` : ""},</p>
      <p>Vaš VIN izvještaj je spreman:</p>
      <p style="margin:16px 0;padding:14px 16px;border:1px solid #ddd;font-family:monospace;font-size:13px">
        ${escapeHtml(args.vin)}
      </p>
      <p style="margin-top:24px">
        <a href="${args.reportUrl}" style="display:inline-block;padding:12px 22px;background:#000;color:#fff;text-decoration:none;font-weight:300;letter-spacing:0.2em;text-transform:uppercase;font-size:11px">
          Preuzmi PDF izvještaj
        </a>
      </p>
      ${exp ? `<p style="color:#888;font-size:12px;margin-top:12px">Link vrijedi do ${exp}. Možete ga ponovno generirati iz svojih postavki.</p>` : ""}
      ${args.listingId ? `<p style="margin-top:16px"><a href="${EMAIL_PUBLIC_SITE_URL}/listing/${args.listingId}" style="color:#888;font-size:12px">Otvori izvorni oglas</a></p>` : ""}
    </div>`;
  return { subject, html, text };
}
