// Lead-gen helpers — financing / insurance / transport submissions.
// Inserts into public.leads with anonymous-allowed RLS. Admin views
// route them to the right partner CRM (manual for v1).

import { supabase } from './supabase';

export type PartnerType = 'financing' | 'insurance' | 'transport';

export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  postcode?: string;
  // financing
  monthly_income?: number;
  desired_loan_eur?: number;
  down_payment_eur?: number;
  loan_term_months?: number;
  // insurance
  birth_year?: number;
  driver_years?: number;
  // transport
  city_from?: string;
  city_to?: string;
  preferred_date?: string;
  // freeform
  notes?: string;
}

export interface LeadInsertResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function submitLead(args: {
  partner_type: PartnerType;
  listing_id?: string;
  payload: LeadPayload;
}): Promise<LeadInsertResult> {
  // Basic guard — name + phone are non-negotiable for any partner.
  if (!args.payload.name?.trim()) return { ok: false, error: 'Ime je obavezno.' };
  if (!args.payload.phone?.trim()) return { ok: false, error: 'Telefon je obavezan.' };

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('leads')
    .insert({
      partner_type: args.partner_type,
      listing_id: args.listing_id ?? null,
      user_id: user?.id ?? null,
      payload: args.payload,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : null,
    })
    .select('id')
    .single();
  if (error) {
    console.warn('[leads] insert failed', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data.id };
}

export const PARTNER_LABEL: Record<PartnerType, string> = {
  financing: 'Pre-approval kredita',
  insurance: 'Ponuda osiguranja',
  transport: 'Ponuda dostave',
};

export const PARTNER_BLURB: Record<PartnerType, string> = {
  financing: 'Bez obveze. Naši partneri (PBZ, Erste, Zaba) javljaju se s ponudom u 24h.',
  insurance: 'Bez obveze. Croatia osiguranje, Allianz, Generali — usporedba u jednoj poruci.',
  transport: 'Cijena dostave od salona do vaše lokacije, javit ćemo se s 2-3 ponude.',
};
