// Inspections — buyer-side reads + inspector-side workflow.
// The inspector role is set by an admin via profiles.role = 'inspector'.
// RLS already lets inspectors SELECT their own bookings; admin policy lets
// admins SELECT all. This lib wraps the common queries.

import { supabase } from './supabase';

export type InspectionStatus =
  | 'pending'    // captured intent, not paid
  | 'paid'       // checkout completed (set by stripe-webhook for kind=inspection)
  | 'assigned'   // inspector claimed
  | 'completed'  // report uploaded
  | 'canceled';

export interface InspectionRow {
  id: string;
  buyer_id: string;
  listing_id: string | null;
  address: string;
  preferred_date: string | null;
  preferred_time_window: 'morning' | 'afternoon' | 'evening' | null;
  notes: string | null;
  status: InspectionStatus;
  inspector_id: string | null;
  report_url: string | null;
  report_summary: string | null;
  report_score: number | null;
  paid_eur: number | null;
  created_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
  // Joined from view
  listing_title?: string | null;
  listing_price?: number | null;
  listing_image?: string | null;
}

// Inspector queue — paid (unassigned) plus inspector's own assigned/completed.
export async function listInspectorQueue(): Promise<InspectionRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('inspection_queue')
    .select('*')
    .or(`status.eq.paid,inspector_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(200);
  return (data ?? []) as InspectionRow[];
}

// Buyer side — see all of my bookings.
export async function listMyInspections(): Promise<InspectionRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('inspection_queue')
    .select('*')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as InspectionRow[];
}

export async function claimInspection(id: string): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niste prijavljeni.' };
  const { error } = await supabase
    .from('inspection_bookings')
    .update({ inspector_id: user.id, status: 'assigned' })
    .eq('id', id)
    .eq('status', 'paid');  // optimistic lock — only claim if still unassigned
  if (error) return { ok: false, error: error.message };
  // Fire-and-forget buyer notification email.
  notifyInspectionAssigned(id).catch(() => {});
  return { ok: true };
}

async function notifyInspectionAssigned(bookingId: string): Promise<void> {
  const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (!fnUrl) return;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;
  await fetch(`${fnUrl}/notify-inspection-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind: 'assigned', booking_id: bookingId }),
  });
}

// Buyer-initiated cancel — refunds via Stripe if paid.
export type CancelReason =
  | 'found_other_inspector'
  | 'no_longer_buying'
  | 'seller_unresponsive'
  | 'scheduling_conflict'
  | 'price_changed'
  | 'vehicle_sold'
  | 'other';

export const CANCEL_REASON_LABEL_HR: Record<CancelReason, string> = {
  found_other_inspector: 'Pronašao sam drugog inspektora',
  no_longer_buying:      'Više ne kupujem ovo vozilo',
  seller_unresponsive:   'Prodavač se ne javlja',
  scheduling_conflict:   'Termin mi ne odgovara',
  price_changed:         'Cijena se promijenila',
  vehicle_sold:          'Vozilo je prodano',
  other:                 'Drugi razlog',
};

export async function cancelMyInspection(
  id: string,
  reason?: CancelReason,
  notes?: string,
): Promise<{ ok: boolean; refunded?: boolean; refund_id?: string | null; error?: string }> {
  const fnUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (!fnUrl) return { ok: false, error: 'Servis nije dostupan.' };
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: 'Sesija je istekla.' };
  try {
    const res = await fetch(`${fnUrl}/cancel-inspection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: id, reason, notes }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j?.error ?? `(${res.status})` };
    return j;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Mrežna greška.' };
  }
}

export async function uploadInspectionReport(args: {
  bookingId: string;
  reportUrl: string;            // public/signed URL after upload
  storagePath?: string;
  summary?: string;
  score?: number;               // 0-100
  inspectorNotes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('inspection_bookings')
    .update({
      report_url: args.reportUrl,
      report_pdf_storage_path: args.storagePath ?? null,
      report_summary: args.summary ?? null,
      report_score: args.score ?? null,
      inspector_notes: args.inspectorNotes ?? null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', args.bookingId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getInspection(id: string): Promise<InspectionRow | null> {
  const { data } = await supabase
    .from('inspection_queue')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data ?? null) as InspectionRow | null;
}

export const STATUS_LABEL_HR: Record<InspectionStatus, string> = {
  pending:   'Na čekanju',
  paid:      'Plaćeno',
  assigned:  'Dodijeljeno',
  completed: 'Gotovo',
  canceled:  'Otkazano',
};

export const TIME_WINDOW_LABEL_HR: Record<NonNullable<InspectionRow['preferred_time_window']>, string> = {
  morning:   'Jutro',
  afternoon: 'Poslijepodne',
  evening:   'Večer',
};
