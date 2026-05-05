// Subscription helpers — talk to Supabase Edge Functions for Stripe Checkout
// (subscription mode) and Customer Portal. Read profile.subscription_tier
// to drive the verified-dealer badge.

import { supabase } from './supabase';

export type SubTierId = 'bronze' | 'silver' | 'gold';
export type SubStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | null;

export interface ProfileSubscription {
  id: string;
  subscription_tier: SubTierId | null;
  subscription_status: SubStatus;
  subscription_renews_at: string | null;
  is_verified: boolean;
  dealer_verified: boolean;
  company_name: string | null;
  logo_url: string | null;
}

const FN_URL = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ?? '';

async function authedFetch(path: string, body?: unknown): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Niste prijavljeni.');
  if (!FN_URL) throw new Error('VITE_SUPABASE_FUNCTIONS_URL nije postavljen.');
  return fetch(`${FN_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function startSubscriptionCheckout(tier: SubTierId): Promise<{ url?: string; error?: string }> {
  try {
    const res = await authedFetch('/create-subscription-checkout', { tier });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { error: `(${res.status}) ${txt || 'Greška pri pokretanju Checkouta.'}` };
    }
    const j = await res.json();
    return { url: j.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Mrežna greška.' };
  }
}

export async function openCustomerPortal(): Promise<{ url?: string; error?: string }> {
  try {
    const res = await authedFetch('/customer-portal');
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { error: `(${res.status}) ${txt || 'Nema aktivne pretplate.'}` };
    }
    const j = await res.json();
    return { url: j.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Mrežna greška.' };
  }
}

// Read the current user's subscription state from public.profiles.
// Returns null when the user is signed out or the profile row doesn't exist yet.
export async function getMySubscription(): Promise<ProfileSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, subscription_tier, subscription_status, subscription_renews_at, is_verified, dealer_verified, company_name, logo_url')
    .eq('id', user.id)
    .maybeSingle();
  return (data ?? null) as ProfileSubscription | null;
}

// Compute verified-dealer status: paying subscriber whose status is good
// (active or trialing) AND has been KYC-verified. We surface badges on
// listing cards, listing details, and dealer profiles.
export function isVerifiedDealer(p: Partial<ProfileSubscription> | null | undefined): boolean {
  if (!p) return false;
  const goodStatus = p.subscription_status === 'active' || p.subscription_status === 'trialing';
  const paidTier = !!p.subscription_tier;
  const kyc = !!(p.is_verified || p.dealer_verified);
  return goodStatus && paidTier && kyc;
}

export function tierLabel(tier: SubTierId | null | undefined): string {
  switch (tier) {
    case 'bronze': return 'Bronze';
    case 'silver': return 'Silver';
    case 'gold':   return 'Gold';
    default:       return '';
  }
}
