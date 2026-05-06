// GET /functions/v1/vin-report-generator
// Scheduled every 5 minutes. Picks up to BATCH paid vin_reports, fulfils each:
//   1. Decode VIN via NHTSA vPIC (no API key, ~80% works for EU VINs).
//   2. Cross-reference our own listings table for prior sightings of the
//      same VIN — same VIN = mileage timeline + photo gallery + price history.
//   3. Render PDF via pdfkit (Croatian-locale, Vozila-branded).
//   4. Upload to Supabase Storage 'vin-reports' bucket (must exist + be private).
//   5. Generate a 30-day signed URL.
//   6. UPDATE vin_reports row: status='delivered', report_url, vpic_data,
//      cross_references, generated_at.
//   7. Email the buyer via existing send-email pipeline.
//
// On per-row failure: row flips to 'failed', error logged. Generator continues
// with next row. Rows that fail can be retried by an admin flipping back to 'paid'.

import { withCron } from "../_shared/cron.ts";
import { sendEmail } from "../_shared/email.ts";
import { tplVinReportReady } from "../_shared/email-vin.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import PDFDocument from "https://esm.sh/pdfkit@0.15.0?target=deno";

const BATCH = 10;
const SIGNED_URL_DAYS = 30;
const STORAGE_BUCKET = "vin-reports";

interface VinReportRow {
  id: string;
  user_id: string | null;
  vin: string;
  listing_id: string | null;
  status: string;
  paid_eur: number | null;
}

interface VPICRow {
  Variable: string;
  Value: string | null;
}

// ----------------------------------------------------------------------------
// vPIC decode — same logic as client lib/vinDecoder.ts but server-side.
// ----------------------------------------------------------------------------

async function decodeVin(vin: string): Promise<{ map: Record<string, string>; raw: VPICRow[] } | { error: string }> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return { error: `vPIC ${res.status}` };
    const j = await res.json() as { Results: VPICRow[] };
    const map: Record<string, string> = {};
    for (const r of j.Results ?? []) {
      if (r.Value && r.Value !== "Not Applicable" && r.Value !== "0") {
        map[r.Variable] = r.Value;
      }
    }
    return { map, raw: j.Results ?? [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "vpic network error" };
  }
}

// ----------------------------------------------------------------------------
// Cross-reference: same VIN seen in our listings.
// ----------------------------------------------------------------------------

interface CrossRef {
  listing_id: string;
  title: string | null;
  price: number | null;
  status: string | null;
  created_at: string;
  attributes: Record<string, unknown> | null;
}

async function crossReferenceVin(vin: string): Promise<CrossRef[]> {
  // VIN may live in attributes->>vin OR (less commonly) in a top-level vin column.
  // attributes->>vin is the wizard's VinQuickFill target; query via JSONB path.
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("id, title, price, status, created_at, attributes")
    .eq("attributes->>vin", vin.toUpperCase())
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) {
    console.warn("[vin-cross-ref]", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    listing_id: r.id as string,
    title: r.title as string | null,
    price: r.price as number | null,
    status: r.status as string | null,
    created_at: r.created_at as string,
    attributes: r.attributes as Record<string, unknown> | null,
  }));
}

// ----------------------------------------------------------------------------
// PDF rendering — Croatian-locale, A4, plain.
// pdfkit emits chunks; we collect into a Uint8Array.
// ----------------------------------------------------------------------------

function renderPdf(args: {
  vin: string;
  paidEur: number | null;
  decoded: Record<string, string>;
  crossRefs: CrossRef[];
  generatedAt: Date;
}): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore — pdfkit Deno wrapper
      const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: `VIN izvještaj ${args.vin}` } });
      const chunks: Uint8Array[] = [];
      doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      doc.on("end", () => {
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const out = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { out.set(c, off); off += c.length; }
        resolve(out);
      });
      doc.on("error", reject);

      // Header
      doc.font("Helvetica-Bold").fontSize(22).text("Vozila.hr — VIN izvještaj", { align: "left" });
      doc.moveDown(0.4);
      doc.font("Helvetica").fontSize(10).fillColor("#666")
         .text(`Generirano: ${args.generatedAt.toLocaleString("hr-HR")} • Plaćeno: ${args.paidEur != null ? args.paidEur.toFixed(2) + " €" : "—"}`);
      doc.moveDown(0.6);
      doc.strokeColor("#ddd").lineWidth(0.5).moveTo(56, doc.y).lineTo(539, doc.y).stroke();
      doc.moveDown(1.2);

      // VIN block
      doc.fillColor("#000").font("Helvetica-Bold").fontSize(11).text("VIN", { underline: false });
      doc.font("Courier").fontSize(18).fillColor("#000").text(args.vin);
      doc.moveDown(1.2);

      // Decoded specs
      doc.font("Helvetica-Bold").fontSize(11).text("Tehnički podaci (NHTSA vPIC)");
      doc.moveDown(0.4);
      const fields: [string, string][] = [
        ["Marka",            args.decoded["Make"]                ?? "—"],
        ["Model",            args.decoded["Model"]               ?? "—"],
        ["Godina",           args.decoded["Model Year"]          ?? "—"],
        ["Tip karoserije",   args.decoded["Body Class"]          ?? "—"],
        ["Pogon",            args.decoded["Drive Type"]          ?? "—"],
        ["Mjenjač",          args.decoded["Transmission Style"]  ?? "—"],
        ["Gorivo",           args.decoded["Fuel Type - Primary"] ?? "—"],
        ["Obujam (cm³)",     args.decoded["Displacement (CC)"]   ?? "—"],
        ["Vrata",            args.decoded["Doors"]               ?? "—"],
        ["Zemlja proizvodnje", args.decoded["Plant Country"]     ?? "—"],
        ["Tvornica",         args.decoded["Plant City"]          ?? "—"],
      ];
      doc.font("Helvetica").fontSize(10).fillColor("#222");
      for (const [k, v] of fields) {
        doc.text(`${k.padEnd(22, " ")}  ${v}`, { continued: false });
      }
      doc.moveDown(1.0);

      // Cross-reference timeline
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000")
         .text(`Povijest na Vozila.hr — ${args.crossRefs.length} ${args.crossRefs.length === 1 ? "prethodni oglas" : "prethodnih oglasa"}`);
      doc.moveDown(0.4);
      if (args.crossRefs.length === 0) {
        doc.font("Helvetica").fontSize(10).fillColor("#666")
           .text("Vozilo s ovim VIN-om nije ranije zabilježeno na Vozila.hr.");
      } else {
        doc.font("Helvetica").fontSize(10).fillColor("#222");
        for (const ref of args.crossRefs) {
          const dt = new Date(ref.created_at).toLocaleDateString("hr-HR");
          const km = (ref.attributes as Record<string, unknown> | null)?.["mileage"];
          const kmStr = typeof km === "number" ? `${km.toLocaleString("hr-HR")} km` : null;
          const priceStr = ref.price != null ? `${ref.price.toLocaleString("hr-HR")} €` : "—";
          const statusStr = ref.status ?? "—";
          doc.text(`${dt} • ${priceStr} • ${statusStr}${kmStr ? ` • ${kmStr}` : ""}`);
          if (ref.title) {
            doc.fillColor("#666").text(`  ${ref.title}`).fillColor("#222");
          }
          doc.moveDown(0.3);
        }
      }

      doc.moveDown(1.5);

      // Disclaimer
      doc.font("Helvetica-Oblique").fontSize(8).fillColor("#666")
         .text(
           "Napomena: Tehnički podaci dolaze iz javne NHTSA vPIC baze (Sjedinjene Države). Točnost može varirati za europska vozila. Povijest je ograničena na podatke koje je Vozila.hr prikupio od svojih korisnika i ne predstavlja sve prethodne vlasnike ili registracije. Ovaj izvještaj ne zamjenjuje stručni tehnički pregled.",
           { align: "justify" },
         );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ----------------------------------------------------------------------------
// Per-row processing.
// ----------------------------------------------------------------------------

async function processOne(row: VinReportRow): Promise<{ ok: boolean; reason?: string }> {
  // Mark as 'generating' to prevent concurrent cron from picking up the same row.
  // (We rely on the BATCH=10 ordering to make the race window tiny.)
  const { error: lockErr } = await supabaseAdmin
    .from("vin_reports")
    .update({ status: "generating" })
    .eq("id", row.id)
    .eq("status", "paid");                // optimistic lock — refuse if already moved
  if (lockErr) {
    return { ok: false, reason: `lock: ${lockErr.message}` };
  }

  const decoded = await decodeVin(row.vin);
  const vpicMap = "error" in decoded ? {} : decoded.map;
  const vpicRaw = "error" in decoded ? [] : decoded.raw;

  const crossRefs = await crossReferenceVin(row.vin);

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderPdf({
      vin: row.vin,
      paidEur: row.paid_eur,
      decoded: vpicMap,
      crossRefs,
      generatedAt: new Date(),
    });
  } catch (e) {
    await supabaseAdmin
      .from("vin_reports")
      .update({ status: "failed" })
      .eq("id", row.id);
    return { ok: false, reason: `pdf: ${e instanceof Error ? e.message : "render error"}` };
  }

  // Upload to private Storage bucket.
  const path = `${row.user_id ?? "anon"}/${row.id}.pdf`;
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (uploadErr) {
    await supabaseAdmin
      .from("vin_reports")
      .update({ status: "failed" })
      .eq("id", row.id);
    return { ok: false, reason: `upload: ${uploadErr.message}` };
  }

  // 30-day signed URL.
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_DAYS * 86400);
  if (signErr || !signed?.signedUrl) {
    await supabaseAdmin
      .from("vin_reports")
      .update({ status: "failed" })
      .eq("id", row.id);
    return { ok: false, reason: `sign: ${signErr?.message ?? "no url"}` };
  }
  const expiresAt = new Date(Date.now() + SIGNED_URL_DAYS * 86_400_000).toISOString();

  // Persist final state.
  await supabaseAdmin
    .from("vin_reports")
    .update({
      status: "delivered",
      report_url: signed.signedUrl,
      signed_url_expires_at: expiresAt,
      storage_path: path,
      vpic_data: vpicMap,
      cross_references: crossRefs,
      generated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  // Drop notification row + email.
  if (row.user_id) {
    await supabaseAdmin.from("notifications").insert({
      user_id: row.user_id,
      type: "vin_report_ready",
      payload: { vin: row.vin, listing_id: row.listing_id, report_url: signed.signedUrl },
    });
  }

  if (row.user_id) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email, company_name")
      .eq("id", row.user_id)
      .maybeSingle();
    if (prof?.email) {
      const tpl = tplVinReportReady({
        recipientName: prof.company_name as string | null,
        vin: row.vin,
        reportUrl: signed.signedUrl,
        expiresAt,
        listingId: row.listing_id,
      });
      await sendEmail({
        to: prof.email as string,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        category: "all",
        userId: row.user_id,
      });
    }
  }

  return { ok: true };
}

// ----------------------------------------------------------------------------
// Cron entry.
// ----------------------------------------------------------------------------

Deno.serve(async () => {
  try {
    const result = await withCron("vin-report-generator", async () => {
      const { data: rows, error } = await supabaseAdmin
        .from("vin_reports")
        .select("id, user_id, vin, listing_id, status, paid_eur")
        .eq("status", "paid")
        .order("created_at", { ascending: true })
        .limit(BATCH);
      if (error) throw new Error(error.message);

      let processed = 0;
      let succeeded = 0;
      const failures: { id: string; reason: string }[] = [];

      for (const row of (rows ?? []) as VinReportRow[]) {
        processed++;
        const res = await processOne(row);
        if (res.ok) succeeded++;
        else failures.push({ id: row.id, reason: res.reason ?? "unknown" });
      }

      return { processed, succeeded, failed: failures.length, failures };
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
