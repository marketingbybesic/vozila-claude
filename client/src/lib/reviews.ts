// Dealer reviews — buyer-side post-sale rating + dealer response.
// Eligibility: buyer must have a message thread > 7 days old with the
// dealer. Enforced here at submit time, plus server-side via the unique
// constraint on (dealer_id, buyer_id, listing_id).

import { supabase } from './supabase';

export interface Review {
  id: string;
  dealer_id: string;
  buyer_id: string;
  listing_id: string | null;
  rating: number;
  body: string | null;
  verified_purchase: boolean;
  dealer_response: string | null;
  response_at: string | null;
  status: 'published' | 'flagged' | 'removed';
  created_at: string;
  // Joined for display.
  buyer?: { id: string; company_name: string | null } | null;
}

export interface DealerRatingSummary {
  dealer_id: string;
  review_count: number;
  avg_rating: number;
  count_5: number;
  count_4: number;
  count_3: number;
  count_2: number;
  count_1: number;
}

const ELIGIBILITY_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function canBuyerReview(dealerId: string): Promise<{ eligible: boolean; reason?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { eligible: false, reason: 'Prijavite se za ostavljanje recenzije.' };
  if (user.id === dealerId) return { eligible: false, reason: 'Ne možete recenzirati sami sebe.' };

  // Must have a message thread > 7 days old with this dealer.
  const since = new Date(Date.now() - ELIGIBILITY_MIN_AGE_MS).toISOString();
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, created_at')
    .eq('buyer_id', user.id)
    .eq('seller_id', dealerId)
    .lte('created_at', since)
    .limit(1);
  if (!convs || convs.length === 0) {
    return { eligible: false, reason: 'Recenziju mogu ostaviti samo kupci s razgovorom starijim od 7 dana.' };
  }

  // Already reviewed?
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('dealer_id', dealerId)
    .eq('buyer_id', user.id)
    .limit(1);
  if (existing && existing.length > 0) {
    return { eligible: false, reason: 'Već ste ostavili recenziju ovom prodavaču.' };
  }

  return { eligible: true };
}

export async function submitReview(args: {
  dealer_id: string;
  listing_id?: string;
  rating: number;
  body?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (args.rating < 1 || args.rating > 5) return { ok: false, error: 'Ocjena 1-5.' };

  const elig = await canBuyerReview(args.dealer_id);
  if (!elig.eligible) return { ok: false, error: elig.reason };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niste prijavljeni.' };

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      dealer_id: args.dealer_id,
      buyer_id: user.id,
      listing_id: args.listing_id ?? null,
      rating: args.rating,
      body: args.body?.trim() || null,
      verified_purchase: true,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function listDealerReviews(dealerId: string, limit = 20): Promise<Review[]> {
  const { data } = await supabase
    .from('reviews')
    .select('*, buyer:profiles!reviews_buyer_id_fkey(id, company_name)')
    .eq('dealer_id', dealerId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
}

export async function getDealerRatingSummary(dealerId: string): Promise<DealerRatingSummary | null> {
  const { data } = await supabase
    .from('dealer_rating_summary')
    .select('*')
    .eq('dealer_id', dealerId)
    .maybeSingle();
  return (data ?? null) as DealerRatingSummary | null;
}

export async function respondToReview(reviewId: string, response: string): Promise<{ ok: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Niste prijavljeni.' };

  const { error } = await supabase
    .from('reviews')
    .update({ dealer_response: response.trim(), response_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('dealer_id', user.id);  // RLS also enforces this
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
