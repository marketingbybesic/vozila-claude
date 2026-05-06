// VIN reports — buyer-side reads + cancel/refresh helpers.
// PDFs live in private Supabase Storage 'vin-reports' bucket; the
// cron-rendered row stores a 30-day signed URL on report_url.

import { supabase } from './supabase';

export type VinReportStatus =
  | 'pending'      // checkout session created, not yet paid (rare race)
  | 'paid'         // webhook fired, awaiting cron
  | 'generating'   // worker locked the row
  | 'delivered'    // PDF rendered + emailed; report_url is the signed URL
  | 'failed';      // render failed; admin can re-flip to 'paid' to retry

export interface VinReportRow {
  id: string;
  user_id: string | null;
  vin: string;
  listing_id: string | null;
  status: VinReportStatus;
  paid_eur: number | null;
  report_url: string | null;
  signed_url_expires_at: string | null;
  storage_path: string | null;
  vpic_data: Record<string, unknown> | null;
  cross_references: Record<string, unknown>[] | null;
  generated_at: string | null;
  created_at: string;
}

// Re-sign the same Storage path for another 30 days. Use when the stored
// signed URL is expired (or about to expire). Returns the fresh URL.
export async function refreshVinReportUrl(reportId: string): Promise<{ ok: boolean; report_url?: string; expires_at?: string; error?: string }> {
  const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (!fnUrl) return { ok: false, error: 'Servis nije dostupan.' };
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: 'Sesija je istekla.' };
  try {
    const res = await fetch(`${fnUrl}/vin-report-refresh-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ report_id: reportId }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j?.error ?? `(${res.status})` };
    return j;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Mrežna greška.' };
  }
}

// Returns true if the row's signed URL is missing or expires within 1 hour.
export function isUrlStale(row: Pick<VinReportRow, 'report_url' | 'signed_url_expires_at'>): boolean {
  if (!row.report_url) return true;
  if (!row.signed_url_expires_at) return false;  // legacy rows pre-010
  const expires = new Date(row.signed_url_expires_at).getTime();
  return expires - Date.now() < 60 * 60 * 1000;
}

export async function listMyVinReports(): Promise<VinReportRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('vin_reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as VinReportRow[];
}

export const VIN_STATUS_LABEL_HR: Record<VinReportStatus, string> = {
  pending:    'Plaćanje u tijeku',
  paid:       'Čeka generiranje',
  generating: 'Generira se',
  delivered:  'Spremno',
  failed:     'Neuspješno — kontaktirajte podršku',
};
