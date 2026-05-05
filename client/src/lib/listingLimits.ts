// Listing-count limits per dealer subscription tier.
// Free users get 3 active listings — enough to try Vozila, not enough to
// run a salon. Subscriptions remove the friction.

import { supabase } from './supabase';
import type { SubTier } from '../types';

export const LISTING_LIMITS: Record<'free' | SubTier, number> = {
  free: 3,
  bronze: 15,
  silver: 50,
  gold: Number.POSITIVE_INFINITY,
};

export interface ListingLimitState {
  tier: 'free' | SubTier;
  used: number;
  limit: number;
  remaining: number;
  exceeded: boolean;
}

// Computes the user's current limit state by reading profiles + counting
// their non-archived listings. Use this to gate the wizard "Submit" button.
export async function getMyListingLimitState(): Promise<ListingLimitState | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: prof } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', user.id)
    .maybeSingle();

  const tierActive = prof?.subscription_status === 'active' || prof?.subscription_status === 'trialing';
  const tier: 'free' | SubTier = (tierActive && prof?.subscription_tier ? (prof.subscription_tier as SubTier) : 'free');
  const limit = LISTING_LIMITS[tier];

  // Count listings that count toward the cap — drafts don't, archived/sold don't.
  const { count } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['active', 'published', 'paused']);

  const used = count ?? 0;
  const remaining = Number.isFinite(limit) ? Math.max(0, limit - used) : Number.POSITIVE_INFINITY;
  return {
    tier,
    used,
    limit,
    remaining,
    exceeded: Number.isFinite(limit) && used >= limit,
  };
}

export function tierLabelHr(tier: 'free' | SubTier): string {
  switch (tier) {
    case 'bronze': return 'Bronze';
    case 'silver': return 'Silver';
    case 'gold':   return 'Gold';
    default:       return 'Besplatni';
  }
}
