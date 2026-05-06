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
  vpic_data: Record<string, unknown> | null;
  cross_references: Record<string, unknown>[] | null;
  generated_at: string | null;
  created_at: string;
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
